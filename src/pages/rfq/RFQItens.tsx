import { FormEvent, useMemo, useState } from 'react';
import { Boxes, BoxSelect, PackageCheck } from 'lucide-react';
import { useRFQContext } from './RFQLayout';

export default function RFQItens() {
  const { items, addItem } = useRFQContext();
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('MRO');
  const [unit, setUnit] = useState('un');
  const [annualVolume, setAnnualVolume] = useState('1000');
  const [preferredSupplier, setPreferredSupplier] = useState('');
  const [lastValidPrice, setLastValidPrice] = useState('0');
  const [lastValidDate, setLastValidDate] = useState(new Date().toISOString().slice(0, 10));

  const totalVolume = useMemo(
    () => items.reduce((acc, item) => acc + item.annualVolume, 0),
    [items]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sku.trim() || !description.trim() || !preferredSupplier.trim()) {
      return;
    }

    await addItem({
      sku: sku.trim().toUpperCase(),
      description: description.trim(),
      category,
      unit,
      annualVolume: Number(annualVolume),
      preferredSupplier: preferredSupplier.trim(),
      lastValidPrice: Number(lastValidPrice),
      lastValidDate
    });

    setSku('');
    setDescription('');
    setCategory('MRO');
    setUnit('un');
    setAnnualVolume('1000');
    setPreferredSupplier('');
    setLastValidPrice('0');
    setLastValidDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="rfq-grid-two">
      <section className="rfq-panel">
        <div className="rfq-panel-title">
          <h2>Cadastro de itens</h2>
          <span>Catálogo estratégico para cotação</span>
        </div>
        <form className="rfq-form" onSubmit={handleSubmit}>
          <label>
            SKU
            <input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Ex.: MEC-5543" />
          </label>
          <label>
            Descrição do item
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Unidade de controle térmico" />
          </label>
          <div className="rfq-form-inline">
            <label>
              Categoria
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="MRO">MRO</option>
                <option value="Estrutural">Estrutural</option>
                <option value="Eletrônica">Eletrônica</option>
                <option value="Serviços">Serviços</option>
              </select>
            </label>
            <label>
              Unidade
              <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="un, kit, m" />
            </label>
            <label>
              Volume anual
              <input type="number" min="1" value={annualVolume} onChange={(event) => setAnnualVolume(event.target.value)} />
            </label>
          </div>
          <div className="rfq-form-inline">
            <label>
              Fornecedor preferencial
              <input value={preferredSupplier} onChange={(event) => setPreferredSupplier(event.target.value)} placeholder="Ex.: Atlas Insumos" />
            </label>
            <label>
              Último preço válido
              <input type="number" min="0" step="0.01" value={lastValidPrice} onChange={(event) => setLastValidPrice(event.target.value)} />
            </label>
            <label>
              Validade histórica
              <input type="date" value={lastValidDate} onChange={(event) => setLastValidDate(event.target.value)} />
            </label>
          </div>
          <button type="submit" className="rfq-button">
            <BoxSelect size={14} />
            Cadastrar item
          </button>
        </form>
      </section>

      <section className="rfq-panel">
        <div className="rfq-inline-title">
          <Boxes size={18} />
          <h2>Itens gerenciados</h2>
        </div>
        <p className="rfq-subtle-text">
          {items.length} itens cadastrados com volume total previsto de {totalVolume.toLocaleString('pt-BR')} unidades.
        </p>
        <div className="rfq-table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Volume</th>
                <th>Fornecedor</th>
                <th>Referência válida</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.sku}</td>
                  <td>{item.description}</td>
                  <td>{item.category} / {item.unit ?? 'un'}</td>
                  <td>{item.annualVolume.toLocaleString('pt-BR')}</td>
                  <td>
                    <span className="rfq-status rfq-status-neutral">
                      <PackageCheck size={12} />
                      {item.preferredSupplier}
                    </span>
                  </td>
                  <td>
                    {item.lastValidPrice ? `R$ ${item.lastValidPrice.toFixed(2)}` : '-'}
                    <div className="rfq-subtle-text">{item.lastValidDate ?? '-'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
