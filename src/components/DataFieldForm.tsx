
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface DataFieldFormProps {
  onSave: (field: { label: string; value: string; type: string }) => void;
  onCancel: () => void;
}

const DataFieldForm = ({ onSave, onCancel }: DataFieldFormProps) => {
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');

  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'address', label: 'Endereço' },
    { value: 'date', label: 'Data' },
    { value: 'currency', label: 'Valor Monetário' },
    { value: 'percentage', label: 'Porcentagem' },
    { value: 'number', label: 'Número' },
    { value: 'custom', label: 'Personalizado' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!label.trim() || !value.trim() || !type) {
      return;
    }

    // Se for tipo personalizado, verificar se foi preenchido
    if (type === 'custom' && !customType.trim()) {
      return;
    }

    onSave({
      label: label.trim(),
      value: value.trim(),
      type: type === 'custom' ? customType.trim() : type,
    });

    setLabel('');
    setValue('');
    setType('');
    setCustomType('');
  };

  const handleTypeChange = (selectedType: string) => {
    setType(selectedType);
    
    // Limpar tipo personalizado se outro tipo for selecionado
    if (selectedType !== 'custom') {
      setCustomType('');
    }
    
    // Auto-fill label based on type
    const typeLabels: { [key: string]: string } = {
      cpf: 'CPF',
      cnpj: 'CNPJ',
      email: 'Email',
      phone: 'Telefone',
      address: 'Endereço',
      date: 'Data',
      currency: 'Valor',
      percentage: 'Porcentagem',
      number: 'Número',
    };
    
    if (typeLabels[selectedType] && !label) {
      setLabel(typeLabels[selectedType]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Adicionar Campo de Dados</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fieldType">Tipo de Campo *</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((fieldType) => (
                    <SelectItem key={fieldType.value} value={fieldType.value}>
                      {fieldType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === 'custom' && (
              <div>
                <Label htmlFor="customType">Tipo Personalizado *</Label>
                <Input
                  id="customType"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Ex: Tipo de Contrato, Modalidade de Serviço"
                  required
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="fieldLabel">Nome do Campo *</Label>
              <Input
                id="fieldLabel"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Nome da Empresa, CPF do Contratante"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="fieldValue">Valor *</Label>
              <Input
                id="fieldValue"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Digite o valor para este campo"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit">
                Adicionar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataFieldForm;
