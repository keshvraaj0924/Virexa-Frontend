import type { SVGProps } from 'react'

/** Angular, layered V: a compact mark shared by public and authenticated views. */
export function VirexaMark(props: SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" viewBox="0 0 32 32" {...props}><path fill="#418FDE" d="M2 5h7l7 13L23 5h7L16 30Z"/><path fill="#8F78DE" d="m10 5 6 11 6-11h-5l-1 3-1-3Z"/><path fill="#A8D8FF" d="m4 5 12 22v-6L7 5Z" opacity=".6"/></svg>
}
