import { VigiaReservas } from "./vigia";

export default function LayoutNegocioDemo({ children }: LayoutProps<"/demo/negocio">) {
  return (
    <>
      <VigiaReservas />
      {children}
    </>
  );
}
