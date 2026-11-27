import { LabelManager } from '../components/ui/Labels'
import { CATEGORIES } from '../utils/labels'
import { useAppearance } from '../components/layout/AppearanceContext'
import { PageHeader } from '../components/ui/PageHeader'
export function SettingsPage() {
 const { appearance, update } = useAppearance()
 return <div className="page-stack"><PageHeader eyebrow="Configurações" title="Aparência" description="Personalize a navegação do seu ambiente de trabalho." />
 <section className="panel-card appearance-panel"><h3>Navegação</h3><p>Altere a posição do menu sem reiniciar o sistema.</p>
 <fieldset><legend>Posição do menu</legend><div className="appearance-options">
 <label className="appearance-option"><input type="radio" name="menu" checked={appearance.menu==='side'} onChange={()=>update({menu:'side'})}/><span><strong>Menu lateral</strong><small>Ícones com descrições e opção de expansão.</small></span></label>
 <label className="appearance-option"><input type="radio" name="menu" checked={appearance.menu==='top'} onChange={()=>update({menu:'top'})}/><span><strong>Menu superior</strong><small>Navegação horizontal acima da área de trabalho.</small></span></label></div></fieldset>
 <label className="appearance-switch"><input type="checkbox" checked={!appearance.expanded} disabled={appearance.menu==='top'} onChange={e=>update({expanded:!e.target.checked})}/><span>Menu lateral compacto (somente ícones)</span></label>
 <label className="appearance-switch"><input type="checkbox" checked={appearance.motion} onChange={e=>update({motion:e.target.checked})}/><span>Animações e transições suaves</span></label>
 <p className="appearance-note" role="status">Preferências aplicadas imediatamente e salvas neste dispositivo.</p></section><section className="panel-card appearance-panel"><h3>Exibição de etiquetas</h3><p>Ocultar uma categoria não altera os registros.</p><label className="appearance-switch"><input type="checkbox" checked disabled/>Andamento das intimações</label>{Object.entries(CATEGORIES).map(([k,v])=><label key={k} className="appearance-switch"><input type="checkbox" checked={appearance.labelVisibility?.[k]!==false} onChange={e=>update({labelVisibility:{...appearance.labelVisibility,[k]:e.target.checked}})}/>{v}</label>)}</section><LabelManager/></div>
}
