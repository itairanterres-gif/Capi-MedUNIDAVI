// Kit de componentes-base — estilo do design system UNIDAVI (paleta, raios,
// sombras), sem persona/mascote (§9: telas de professor e admin são
// interface funcional pura). Alvos de toque generosos por padrão (tela do
// aluno, §11).
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div {...rest} className={`bg-surface rounded-lg border border-border shadow ${className}`}>
      {children}
    </div>
  )
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'terra' | 'success'

const VARIANT_CLASSES: Record<BtnVariant, string> = {
  primary: 'bg-blue text-white hover:bg-blueDark',
  secondary: 'bg-blueLight text-blue border border-border hover:bg-white',
  ghost: 'bg-transparent text-textSec border border-border hover:bg-bg',
  terra: 'bg-terra text-white hover:opacity-90',
  success: 'bg-green text-white hover:opacity-90',
}

export function Btn({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded font-semibold
        px-5 py-3 text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        min-h-[44px] ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'terra' }) {
  const tones: Record<string, string> = {
    blue: 'bg-blueLight text-blue',
    green: 'bg-greenLight text-green',
    amber: 'bg-amberLight text-amber',
    red: 'bg-redLight text-red',
    terra: 'bg-terraLight text-terra',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        {subtitle && <p className="text-textSec mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-redLight border border-red/30 text-red rounded px-4 py-3 text-sm font-medium">
      {message}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 rounded-full border-4 border-blueLight border-t-blue animate-spin" />
    </div>
  )
}
