
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';

interface Document {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalDocuments: number;
  draftDocuments: number;
  pendingSignatures: number;
  signedDocuments: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    draftDocuments: 0,
    pendingSignatures: 0,
    signedDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch recent documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

      // Fetch stats
      const { data: allDocuments, error: statsError } = await supabase
        .from('documents')
        .select('status');

      if (statsError) throw statsError;

      const totalDocuments = allDocuments?.length || 0;
      const draftDocuments = allDocuments?.filter(doc => doc.status === 'draft').length || 0;
      const pendingSignatures = allDocuments?.filter(doc => doc.status === 'pending_signature').length || 0;
      const signedDocuments = allDocuments?.filter(doc => doc.status === 'signed').length || 0;

      setStats({
        totalDocuments,
        draftDocuments,
        pendingSignatures,
        signedDocuments,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Bem-vindo de volta! Aqui está um resumo dos seus documentos.</p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/create">
              <Plus className="h-4 w-4 mr-2" />
              Novo Documento
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                Todos os documentos criados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draftDocuments}</div>
              <p className="text-xs text-muted-foreground">
                Documentos em elaboração
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Assinatura</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSignatures}</div>
              <p className="text-xs text-muted-foreground">
                Documentos pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinados</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.signedDocuments}</div>
              <p className="text-xs text-muted-foreground">
                Documentos finalizados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Documentos Recentes</CardTitle>
                <CardDescription>
                  Seus documentos mais recentes e seu status atual
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link to="/documents">Ver Todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum documento encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece criando seu primeiro documento
                </p>
                <Button asChild>
                  <Link to="/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Documento
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{document.title}</h3>
                        <p className="text-sm text-gray-600">
                          {getDocumentTypeLabel(document.type)} • 
                          Atualizado em {new Date(document.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(document.status)}
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/documents/${document.id}`}>
                          Ver Detalhes
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
