import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, FileText, Users, Settings } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import SignerForm from '@/components/SignerForm';
import DataFieldForm from '@/components/DataFieldForm';

interface Signer {
  name: string;
  email: string;
  role?: string;
}

interface DataField {
  label: string;
  value: string;
  type: string;
}

const Create = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Estados do formulário
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [signers, setSigners] = useState<Signer[]>([]);
  const [fillWithData, setFillWithData] = useState(false);
  const [specificData, setSpecificData] = useState<DataField[]>([]);
  
  // Estados para formulários modais
  const [showSignerForm, setShowSignerForm] = useState(false);
  const [showDataForm, setShowDataForm] = useState(false);

  const documentTypes = [
    { value: 'contract', label: 'Contrato' },
    { value: 'nda', label: 'Acordo de Confidencialidade (NDA)' },
    { value: 'power_of_attorney', label: 'Procuração' },
    { value: 'service_agreement', label: 'Acordo de Prestação de Serviços' },
    { value: 'employment_contract', label: 'Contrato de Trabalho' },
    { value: 'rental_agreement', label: 'Contrato de Aluguel' },
    { value: 'partnership_agreement', label: 'Acordo de Parceria' },
    { value: 'other', label: 'Outro' },
  ];

  const addSigner = (signer: Signer) => {
    setSigners([...signers, signer]);
    setShowSignerForm(false);
  };

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const addDataField = (field: DataField) => {
    setSpecificData([...specificData, field]);
    setShowDataForm(false);
  };

  const removeDataField = (index: number) => {
    setSpecificData(specificData.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim() || !documentType || signers.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const selectedDocType = documentTypes.find(t => t.value === documentType);

      const response = await supabase.functions.invoke('generate-document', {
        body: {
          description,
          documentType: documentType, // Valor do enum
          documentTypeLabel: selectedDocType?.label, // Label para exibição
          signers,
          fillWithData,
          specificData
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Function error:', response.error);
        throw response.error;
      }

      toast.success('Documento gerado com sucesso!');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Novo Documento</h1>
          <p className="text-gray-600">Use IA para gerar documentos legais profissionais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Descrição do Documento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Descrição do Documento
              </CardTitle>
              <CardDescription>
                Descreva brevemente o documento que você deseja criar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="documentType">Tipo de Documento *</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Contrato de prestação de serviços de consultoria em marketing digital para empresa X, com duração de 6 meses..."
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Signatários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Signatários
              </CardTitle>
              <CardDescription>
                Adicione as pessoas que precisam assinar o documento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {signers.map((signer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{signer.name}</p>
                      <p className="text-sm text-gray-600">{signer.email}</p>
                      {signer.role && <Badge variant="secondary">{signer.role}</Badge>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSigner(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSignerForm(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Signatário
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dados Específicos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Dados Específicos
              </CardTitle>
              <CardDescription>
                Opcionalmente, preencha o documento com dados específicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="fillWithData"
                    checked={fillWithData}
                    onChange={(e) => setFillWithData(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="fillWithData">
                    Preencher documento com dados específicos
                  </Label>
                </div>

                {fillWithData && (
                  <div className="space-y-3">
                    {specificData.map((field, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{field.label}</p>
                          <p className="text-sm text-gray-600">{field.value}</p>
                          <Badge variant="outline">{field.type}</Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDataField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDataForm(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Campo de Dados
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !description.trim() || !documentType || signers.length === 0}
            >
              {loading ? 'Gerando...' : 'Gerar Documento'}
            </Button>
          </div>
        </form>

        {/* Modals */}
        {showSignerForm && (
          <SignerForm
            onSave={addSigner}
            onCancel={() => setShowSignerForm(false)}
          />
        )}

        {showDataForm && (
          <DataFieldForm
            onSave={addDataField}
            onCancel={() => setShowDataForm(false)}
          />
        )}
      </div>
    </Layout>
  );
};

export default Create;
