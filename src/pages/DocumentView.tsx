import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  ArrowLeft, 
  Users, 
  Calendar,
  Download,
  Edit,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Document {
  id: string;
  title: string;
  type: string;
  status: string;
  content: any; // Using any for JSON content from Supabase
  created_at: string;
  updated_at: string;
}

interface DocumentSignature {
  id: string;
  signer_name: string;
  signer_email: string;
  status: string;
  signed_at: string | null;
}

const DocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [signatures, setSignatures] = useState<DocumentSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [saving, setSaving] = useState(false);
  const documentContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchDocument();
      fetchSignatures();
    }
  }, [id]);

  const fetchDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDocument(data);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Erro ao carregar documento');
      navigate('/dashboard');
    }
  };

  const fetchSignatures = async () => {
    try {
      const { data, error } = await supabase
        .from('document_signatures')
        .select('*')
        .eq('document_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSignatures(data || []);
    } catch (error) {
      console.error('Error fetching signatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
      pending_signature: { label: 'Aguardando Assinatura', color: 'bg-yellow-100 text-yellow-800' },
      signed: { label: 'Assinado', color: 'bg-green-100 text-green-800' },
      expired: { label: 'Expirado', color: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getSignatureStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      signed: { label: 'Assinado', color: 'bg-green-100 text-green-800' },
      declined: { label: 'Recusado', color: 'bg-red-100 text-red-800' },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getDocumentTypeLabel = (type: string) => {
    const typeMap = {
      contract: 'Contrato',
      nda: 'NDA',
      power_of_attorney: 'Procuração',
      service_agreement: 'Acordo de Serviços',
      employment_contract: 'Contrato de Trabalho',
      rental_agreement: 'Contrato de Aluguel',
      partnership_agreement: 'Acordo de Parceria',
      other: 'Outro',
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const openEditModal = () => {
    if (!document) return;
    setEditedText(document.content.text || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!document) return;

    setSaving(true);
    toast.info('Salvando alterações...');

    try {
      const updatedContent = {
        ...document.content,
        text: editedText
      };

      const { error } = await supabase
        .from('documents')
        .update({ 
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (error) throw error;

      // Atualizar o estado local
      setDocument({
        ...document,
        content: updatedContent,
        updated_at: new Date().toISOString()
      });

      setShowEditModal(false);
      toast.success('Documento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!document || !documentContentRef.current) return;

    setGeneratingPDF(true);
    toast.info('Gerando PDF...');

    try {
      // Criar um clone do elemento para personalizar para PDF
      const element = documentContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calcular dimensões
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calcular ratio para manter proporção
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // Adicionar cabeçalho
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(document.title, 10, 15);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${getDocumentTypeLabel(document.type)} - ${new Date().toLocaleDateString('pt-BR')}`, 10, 22);
      
      // Adicionar linha separadora
      pdf.line(10, 25, pdfWidth - 10, 25);
      
      // Adicionar o conteúdo capturado
      const startY = 30;
      if (finalHeight > pdfHeight - startY) {
        // Se for muito grande, dividir em páginas
        const pageHeight = pdfHeight - startY;
        let currentY = 0;
        
        while (currentY < finalHeight) {
          pdf.addImage(
            imgData,
            'PNG',
            (pdfWidth - finalWidth) / 2,
            startY - currentY,
            finalWidth,
            finalHeight
          );
          
          currentY += pageHeight;
          if (currentY < finalHeight) {
            pdf.addPage();
          }
        }
      } else {
        pdf.addImage(
          imgData,
          'PNG',
          (pdfWidth - finalWidth) / 2,
          startY,
          finalWidth,
          finalHeight
        );
      }
      
      // Adicionar informações dos signatários na última página
      if (signatures.length > 0) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Signatários', 10, 20);
        
        let yPosition = 30;
        signatures.forEach((signature, index) => {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${index + 1}. ${signature.signer_name}`, 10, yPosition);
          pdf.text(`   Email: ${signature.signer_email}`, 10, yPosition + 5);
          pdf.text(`   Status: ${signature.status === 'pending' ? 'Pendente' : signature.status === 'signed' ? 'Assinado' : 'Recusado'}`, 10, yPosition + 10);
          
          if (signature.signed_at) {
            pdf.text(`   Assinado em: ${new Date(signature.signed_at).toLocaleDateString('pt-BR')}`, 10, yPosition + 15);
            yPosition += 25;
          } else {
            yPosition += 20;
          }
        });
      }
      
      // Download do PDF
      const fileName = `${document.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Documento não encontrado</h1>
            <Button onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
              <p className="text-gray-600">
                {getDocumentTypeLabel(document.type)} • 
                Criado em {new Date(document.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(document.status)}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generatePDF}
              disabled={generatingPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              {generatingPDF ? 'Gerando...' : 'Baixar PDF'}
            </Button>
            <Button variant="outline" size="sm" onClick={openEditModal}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Conteúdo do Documento */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Conteúdo do Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none" ref={documentContentRef}>
                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <div className="text-sm leading-relaxed">
                      <ReactMarkdown>
                        {document.content.text || 'Conteúdo não disponível'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados Específicos */}
            {document.content.specificData && document.content.specificData.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Dados Específicos</CardTitle>
                  <CardDescription>
                    Informações adicionais incluídas no documento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {document.content.specificData.map((field, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{field.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                        </div>
                        <p className="text-gray-600">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Informações e Assinaturas */}
          <div className="space-y-6">
            {/* Informações do Documento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(document.status)}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500">Tipo</p>
                  <p className="mt-1">{getDocumentTypeLabel(document.type)}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500">Criado em</p>
                  <p className="mt-1">{new Date(document.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500">Última atualização</p>
                  <p className="mt-1">{new Date(document.updated_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Signatários */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Signatários ({signatures.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {signatures.map((signature, index) => (
                    <div key={signature.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{signature.signer_name}</p>
                        <p className="text-xs text-gray-600">{signature.signer_email}</p>
                        {signature.signed_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Assinado em {new Date(signature.signed_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div>
                        {getSignatureStatusBadge(signature.status)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {signatures.some(s => s.status === 'pending') && (
                  <div className="mt-4 pt-4 border-t">
                    <Button className="w-full" size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Lembretes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de Edição */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Documento
              </DialogTitle>
              <DialogDescription>
                Edite o conteúdo do documento. Você pode usar Markdown para formatação.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0">
              <Tabs defaultValue="edit" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit">Editar</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="edit" className="flex-1 min-h-0 mt-4">
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    placeholder="Digite o conteúdo do documento..."
                    className="h-full min-h-[400px] resize-none font-mono text-sm"
                  />
                </TabsContent>
                
                <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
                  <div className="h-full border rounded-md p-4 overflow-auto bg-gray-50">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>
                        {editedText || 'Nenhum conteúdo para preview...'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default DocumentView; 