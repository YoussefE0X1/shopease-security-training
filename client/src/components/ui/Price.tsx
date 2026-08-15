import { price as formatPrice } from '../../utils/format';

interface Props { value: number; className?: string }

export function Price({ value, className = '' }: Props) {
  return <span className={`font-semibold text-indigo-600 ${className}`}>${formatPrice(value)}</span>;
}
