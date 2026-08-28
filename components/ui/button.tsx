import type { ButtonHTMLAttributes } from 'react';

export default function Button({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button {...props} className={`ui-button ui-button-${variant} ${props.className ?? ''}`} />;
}
