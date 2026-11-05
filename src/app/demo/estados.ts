import type { EstadoPedido } from "./almacen";

export const ESTADO_CLIENTE: Record<EstadoPedido, { texto: string; clase: string }> = {
  por_confirmar: { texto: "Esperando confirmación del negocio", clase: "bg-secondary text-secondary-foreground" },
  confirmado: { texto: "Confirmado: ya puedes ir", clase: "bg-primary text-primary-foreground" },
  entregado: { texto: "Entregado", clase: "bg-muted text-muted-foreground" },
  rechazado: { texto: "Rechazado por el negocio", clase: "bg-destructive/10 text-destructive" },
  cancelado: { texto: "Cancelado", clase: "bg-muted text-muted-foreground" },
};

export const ESTADO_NEGOCIO: Record<EstadoPedido, { texto: string; clase: string }> = {
  por_confirmar: { texto: "Por confirmar", clase: "bg-accent text-accent-foreground" },
  confirmado: { texto: "Por entregar", clase: "bg-primary text-primary-foreground" },
  entregado: { texto: "Entregado", clase: "bg-muted text-muted-foreground" },
  rechazado: { texto: "Rechazado", clase: "bg-destructive/10 text-destructive" },
  cancelado: { texto: "Cancelado por el cliente", clase: "bg-muted text-muted-foreground" },
};
