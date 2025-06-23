
-- Create enum for document types
CREATE TYPE document_type AS ENUM (
  'contract',
  'nda',
  'power_of_attorney',
  'service_agreement',
  'employment_contract',
  'rental_agreement',
  'partnership_agreement',
  'other'
);

-- Create enum for document status
CREATE TYPE document_status AS ENUM (
  'draft',
  'pending_signature',
  'signed',
  'expired',
  'cancelled'
);

-- Create enum for signature status
CREATE TYPE signature_status AS ENUM (
  'pending',
  'signed',
  'declined'
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  company TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document templates table
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type document_type NOT NULL,
  template_content JSONB NOT NULL, -- Store template structure and fields
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.document_templates(id),
  title TEXT NOT NULL,
  type document_type NOT NULL,
  content JSONB NOT NULL, -- Store filled document content
  status document_status DEFAULT 'draft',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document signatures table
CREATE TABLE public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  signer_email TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signature_data TEXT, -- Base64 encoded signature image
  status signature_status DEFAULT 'pending',
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document versions table (for tracking changes)
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert trigger function for profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for document templates (public read)
CREATE POLICY "Anyone can view active templates" ON public.document_templates
  FOR SELECT USING (is_active = true);

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for document signatures
CREATE POLICY "Users can view signatures of their documents" ON public.document_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = document_signatures.document_id 
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create signatures for their documents" ON public.document_signatures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = document_signatures.document_id 
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update signatures for their documents" ON public.document_signatures
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = document_signatures.document_id 
      AND creator_id = auth.uid()
    )
  );

-- RLS Policies for document versions
CREATE POLICY "Users can view versions of their documents" ON public.document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = document_versions.document_id 
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions for their documents" ON public.document_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = document_versions.document_id 
      AND creator_id = auth.uid()
    ) AND auth.uid() = created_by
  );

-- Insert some sample templates
INSERT INTO public.document_templates (name, description, type, template_content) VALUES
  (
    'Contrato de Prestação de Serviços',
    'Modelo padrão para contratos de prestação de serviços profissionais',
    'service_agreement',
    '{
      "fields": [
        {"name": "contractor_name", "label": "Nome do Contratado", "type": "text", "required": true},
        {"name": "contractor_document", "label": "CPF/CNPJ do Contratado", "type": "text", "required": true},
        {"name": "client_name", "label": "Nome do Contratante", "type": "text", "required": true},
        {"name": "client_document", "label": "CPF/CNPJ do Contratante", "type": "text", "required": true},
        {"name": "service_description", "label": "Descrição dos Serviços", "type": "textarea", "required": true},
        {"name": "value", "label": "Valor Total", "type": "number", "required": true},
        {"name": "start_date", "label": "Data de Início", "type": "date", "required": true},
        {"name": "end_date", "label": "Data de Término", "type": "date", "required": false}
      ]
    }'
  ),
  (
    'Acordo de Confidencialidade (NDA)',
    'Modelo de acordo de não divulgação para proteção de informações confidenciais',
    'nda',
    '{
      "fields": [
        {"name": "disclosing_party", "label": "Parte Reveladora", "type": "text", "required": true},
        {"name": "receiving_party", "label": "Parte Receptora", "type": "text", "required": true},
        {"name": "purpose", "label": "Finalidade", "type": "textarea", "required": true},
        {"name": "duration", "label": "Duração (em anos)", "type": "number", "required": true},
        {"name": "effective_date", "label": "Data de Vigência", "type": "date", "required": true}
      ]
    }'
  ),
  (
    'Contrato de Aluguel',
    'Modelo para contratos de locação residencial ou comercial',
    'rental_agreement',
    '{
      "fields": [
        {"name": "landlord_name", "label": "Nome do Locador", "type": "text", "required": true},
        {"name": "tenant_name", "label": "Nome do Locatário", "type": "text", "required": true},
        {"name": "property_address", "label": "Endereço do Imóvel", "type": "textarea", "required": true},
        {"name": "monthly_rent", "label": "Valor do Aluguel Mensal", "type": "number", "required": true},
        {"name": "deposit", "label": "Valor da Caução", "type": "number", "required": true},
        {"name": "lease_start", "label": "Início do Contrato", "type": "date", "required": true},
        {"name": "lease_duration", "label": "Duração (em meses)", "type": "number", "required": true}
      ]
    }'
  );
