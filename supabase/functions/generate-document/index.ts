
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: user } = await supabase.auth.getUser(token);

    if (!user.user) {
      throw new Error('Usuário não autenticado');
    }

    const { 
      description, 
      documentType, 
      documentTypeLabel,
      signers, 
      fillWithData, 
      specificData 
    } = await req.json();

    console.log('Received data:', { documentType, documentTypeLabel, signers: signers.length });

    // Construir o prompt para a OpenAI
    let prompt = `Você é um especialista em documentos legais brasileiros. 
    
Crie um documento do tipo "${documentTypeLabel}" baseado na seguinte descrição: "${description}"

O documento deve incluir espaços para as seguintes assinaturas:
${signers.map((signer: any, index: number) => `${index + 1}. ${signer.name} (${signer.email}) - ${signer.role || 'Parte'}`).join('\n')}`;

    if (fillWithData && specificData && specificData.length > 0) {
      prompt += `\n\nPreencha o documento com os seguintes dados específicos:
${specificData.map((data: any) => `- ${data.label}: ${data.value}`).join('\n')}`;
    } else {
      prompt += `\n\nDeixe campos marcados com [CAMPO_A_PREENCHER] para serem preenchidos posteriormente pelos usuários.`;
    }

    prompt += `\n\nO documento deve:
- Estar em português brasileiro
- Seguir padrões legais brasileiros
- Incluir cláusulas apropriadas para o tipo de documento
- Ter espaços claramente marcados para assinaturas
- Ser profissional e juridicamente sólido
- Incluir data e local para assinatura

Retorne apenas o conteúdo do documento em formato texto, sem explicações adicionais.`;

    console.log('Calling OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em documentos legais brasileiros. Crie documentos profissionais, juridicamente válidos e bem estruturados.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated content length:', generatedContent.length);

    // Usar o valor do enum correto para o banco
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        title: `${documentTypeLabel} - ${new Date().toLocaleDateString('pt-BR')}`,
        type: documentType, // Usar o valor do enum aqui
        creator_id: user.user.id,
        content: {
          text: generatedContent,
          signers: signers,
          specificData: specificData || []
        },
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Document created successfully:', document.id);

    // Criar registros de assinatura para cada signatário
    const signaturePromises = signers.map((signer: any) => 
      supabase.from('document_signatures').insert({
        document_id: document.id,
        signer_name: signer.name,
        signer_email: signer.email,
        status: 'pending'
      })
    );

    await Promise.all(signaturePromises);

    return new Response(JSON.stringify({ 
      document,
      generatedContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-document function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
