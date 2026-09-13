export type Movimiento = { t: 'sello' | 'canje'; d: string };

export type Tarjeta = {
  id: string;
  name: string;
  kids: string;
  since: string;
  redeemed: number;
  hist: Movimiento[];
};

export type Estado = { active: string; cards: Tarjeta[] };

export const META = 8;      // visitas para el pase gratis
export const MEDIA = 4;     // visitas para el 10% en café

const sellos = (fechas: string[]): Movimiento[] => fechas.map((d) => ({ t: 'sello', d }));

/** Familias de ejemplo. Rojas Salas va en 7 de 8: un sello y se ve la celebración. */
export const familiasDemo = (): Estado => ({
  active: 'sg-1042',
  cards: [
    {
      id: 'sg-1042', name: 'Valeria Mora', kids: 'Emma, 3 años', since: '2026-08-14', redeemed: 0,
      hist: sellos(['2026-08-14T10:20', '2026-08-21T16:05', '2026-08-28T10:40', '2026-09-04T15:30', '2026-09-11T10:15']),
    },
    {
      id: 'sg-1017', name: 'Familia Rojas Salas', kids: 'Mateo y Luca, 5 y 2 años', since: '2026-08-09', redeemed: 0,
      hist: sellos(['2026-08-09T09:30', '2026-08-12T16:10', '2026-08-16T09:45', '2026-08-23T10:00', '2026-08-30T09:50', '2026-09-05T16:20', '2026-09-09T10:05']),
    },
    {
      id: 'sg-1088', name: 'Daniel Chaves', kids: 'Sofía, 6 años', since: '2026-09-10', redeemed: 0,
      hist: sellos(['2026-09-10T15:40']),
    },
  ],
});
