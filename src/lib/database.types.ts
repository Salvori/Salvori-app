export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      calificaciones: {
        Row: {
          aseo: number
          atencion: number
          calidad: number
          comentario: string
          comprador_id: string
          creado_en: string
          id: string
          negocio_id: string
          reserva_id: string
        }
        Insert: {
          aseo: number
          atencion: number
          calidad: number
          comentario?: string
          comprador_id?: string
          creado_en?: string
          id?: string
          negocio_id: string
          reserva_id: string
        }
        Update: {
          aseo?: number
          atencion?: number
          calidad?: number
          comentario?: string
          comprador_id?: string
          creado_en?: string
          id?: string
          negocio_id?: string
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: true
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      direcciones_comprador: {
        Row: {
          actualizado_en: string
          direccion: string
          lat: number
          lng: number
          user_id: string
        }
        Insert: {
          actualizado_en?: string
          direccion: string
          lat: number
          lng: number
          user_id?: string
        }
        Update: {
          actualizado_en?: string
          direccion?: string
          lat?: number
          lng?: number
          user_id?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          creado_en: string
          id: string
          negocio_id: string
          oferta_id: string
          origen: string
          tipo: Database["public"]["Enums"]["tipo_evento"]
        }
        Insert: {
          creado_en?: string
          id?: string
          negocio_id: string
          oferta_id: string
          origen?: string
          tipo: Database["public"]["Enums"]["tipo_evento"]
        }
        Update: {
          creado_en?: string
          id?: string
          negocio_id?: string
          oferta_id?: string
          origen?: string
          tipo?: Database["public"]["Enums"]["tipo_evento"]
        }
        Relationships: [
          {
            foreignKeyName: "eventos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      interesados: {
        Row: {
          autoriza_datos: boolean
          autorizado_en: string
          correo: string
          creado_en: string
          id: string
          lat: number
          lng: number
          origen_ubicacion: string
          radio_km: number
          token_baja: string
          ultimo_envio: string | null
          user_id: string | null
        }
        Insert: {
          autoriza_datos: boolean
          autorizado_en?: string
          correo: string
          creado_en?: string
          id?: string
          lat: number
          lng: number
          origen_ubicacion: string
          radio_km: number
          token_baja?: string
          ultimo_envio?: string | null
          user_id?: string | null
        }
        Update: {
          autoriza_datos?: boolean
          autorizado_en?: string
          correo?: string
          creado_en?: string
          id?: string
          lat?: number
          lng?: number
          origen_ubicacion?: string
          radio_km?: number
          token_baja?: string
          ultimo_envio?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      negocio_miembros: {
        Row: {
          creado_en: string
          negocio_id: string
          user_id: string
        }
        Insert: {
          creado_en?: string
          negocio_id: string
          user_id: string
        }
        Update: {
          creado_en?: string
          negocio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_miembros_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          activo: boolean
          categoria: Database["public"]["Enums"]["categoria"]
          creado_en: string
          descripcion: string
          direccion: string
          es_prueba: boolean
          foto_portada: string | null
          horario: Json
          id: string
          lat: number
          lng: number
          logo_url: string | null
          nombre: string
          slug: string
          telefono_whatsapp: string | null
        }
        Insert: {
          activo?: boolean
          categoria: Database["public"]["Enums"]["categoria"]
          creado_en?: string
          descripcion?: string
          direccion?: string
          es_prueba?: boolean
          foto_portada?: string | null
          horario?: Json
          id?: string
          lat: number
          lng: number
          logo_url?: string | null
          nombre: string
          slug: string
          telefono_whatsapp?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria"]
          creado_en?: string
          descripcion?: string
          direccion?: string
          es_prueba?: boolean
          foto_portada?: string | null
          horario?: Json
          id?: string
          lat?: number
          lng?: number
          logo_url?: string | null
          nombre?: string
          slug?: string
          telefono_whatsapp?: string | null
        }
        Relationships: []
      }
      oferta_programacion: {
        Row: {
          activa: boolean
          creado_en: string
          dias_semana: number[]
          hora_publicacion: string
          id: string
          negocio_id: string
          plantilla_oferta_id: string
          ultima_publicacion: string | null
        }
        Insert: {
          activa?: boolean
          creado_en?: string
          dias_semana: number[]
          hora_publicacion: string
          id?: string
          negocio_id: string
          plantilla_oferta_id: string
          ultima_publicacion?: string | null
        }
        Update: {
          activa?: boolean
          creado_en?: string
          dias_semana?: number[]
          hora_publicacion?: string
          id?: string
          negocio_id?: string
          plantilla_oferta_id?: string
          ultima_publicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oferta_programacion_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oferta_programacion_plantilla_oferta_id_fkey"
            columns: ["plantilla_oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria"]
          contenido: string
          creado_en: string
          cupos_disponibles: number
          cupos_total: number
          elaborado_en: string | null
          es_prueba: boolean
          estado: Database["public"]["Enums"]["estado_oferta"]
          formato: string
          foto_url: string
          id: string
          lleva: number | null
          negocio_id: string
          paga: number | null
          precio_final: number
          precio_habitual: number
          publicada_por: string | null
          recogida_desde: string
          recogida_hasta: string
          tamano: string | null
          tiempo_preparacion_min: number | null
          tipo: Database["public"]["Enums"]["tipo_oferta"]
          titulo: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria"]
          contenido: string
          creado_en?: string
          cupos_disponibles: number
          cupos_total: number
          elaborado_en?: string | null
          es_prueba?: boolean
          estado?: Database["public"]["Enums"]["estado_oferta"]
          formato?: string
          foto_url: string
          id?: string
          lleva?: number | null
          negocio_id: string
          paga?: number | null
          precio_final: number
          precio_habitual: number
          publicada_por?: string | null
          recogida_desde: string
          recogida_hasta: string
          tamano?: string | null
          tiempo_preparacion_min?: number | null
          tipo: Database["public"]["Enums"]["tipo_oferta"]
          titulo: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria"]
          contenido?: string
          creado_en?: string
          cupos_disponibles?: number
          cupos_total?: number
          elaborado_en?: string | null
          es_prueba?: boolean
          estado?: Database["public"]["Enums"]["estado_oferta"]
          formato?: string
          foto_url?: string
          id?: string
          lleva?: number | null
          negocio_id?: string
          paga?: number | null
          precio_final?: number
          precio_habitual?: number
          publicada_por?: string | null
          recogida_desde?: string
          recogida_hasta?: string
          tamano?: string | null
          tiempo_preparacion_min?: number | null
          tipo?: Database["public"]["Enums"]["tipo_oferta"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas_avisadas: {
        Row: {
          enviados: number
          oferta_id: string
          procesada_en: string
        }
        Insert: {
          enviados?: number
          oferta_id: string
          procesada_en?: string
        }
        Update: {
          enviados?: number
          oferta_id?: string
          procesada_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_avisadas_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: true
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_mensualidad: {
        Row: {
          creado_en: string
          id: string
          metodo: string
          negocio_id: string
          nota: string
          periodo_desde: string
          periodo_hasta: string
          plan_id: string
          registrado_por: string | null
          valor: number
        }
        Insert: {
          creado_en?: string
          id?: string
          metodo: string
          negocio_id: string
          nota?: string
          periodo_desde: string
          periodo_hasta: string
          plan_id: string
          registrado_por?: string | null
          valor: number
        }
        Update: {
          creado_en?: string
          id?: string
          metodo?: string
          negocio_id?: string
          nota?: string
          periodo_desde?: string
          periodo_hasta?: string
          plan_id?: string
          registrado_por?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagos_mensualidad_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_mensualidad_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      planes: {
        Row: {
          activo: boolean
          creado_en: string
          dias_prueba: number | null
          id: string
          max_ofertas_activas: number | null
          nombre: string
          orden: number
          precio_mensual: number
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          dias_prueba?: number | null
          id?: string
          max_ofertas_activas?: number | null
          nombre: string
          orden?: number
          precio_mensual?: number
        }
        Update: {
          activo?: boolean
          creado_en?: string
          dias_prueba?: number | null
          id?: string
          max_ofertas_activas?: number | null
          nombre?: string
          orden?: number
          precio_mensual?: number
        }
        Relationships: []
      }
      reservas: {
        Row: {
          cancelada_en: string | null
          cantidad: number
          codigo: string | null
          comprador_id: string
          confirmada_en: string | null
          entregada_en: string | null
          estado: Database["public"]["Enums"]["estado_reserva"]
          id: string
          incumplida_por: string | null
          lista_en: string | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_incumplimiento: string | null
          motivo_rechazo: string | null
          no_recogida_en: string | null
          observaciones: string
          oferta_id: string
          origen: string
          precio_habitual_unitario: number
          precio_unitario: number
          rechazada_en: string | null
          recogida_desde: string
          recogida_hasta: string
          solicitada_en: string
        }
        Insert: {
          cancelada_en?: string | null
          cantidad: number
          codigo?: string | null
          comprador_id: string
          confirmada_en?: string | null
          entregada_en?: string | null
          estado?: Database["public"]["Enums"]["estado_reserva"]
          id?: string
          incumplida_por?: string | null
          lista_en?: string | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_incumplimiento?: string | null
          motivo_rechazo?: string | null
          no_recogida_en?: string | null
          observaciones?: string
          oferta_id: string
          origen?: string
          precio_habitual_unitario: number
          precio_unitario: number
          rechazada_en?: string | null
          recogida_desde: string
          recogida_hasta: string
          solicitada_en?: string
        }
        Update: {
          cancelada_en?: string | null
          cantidad?: number
          codigo?: string | null
          comprador_id?: string
          confirmada_en?: string | null
          entregada_en?: string | null
          estado?: Database["public"]["Enums"]["estado_reserva"]
          id?: string
          incumplida_por?: string | null
          lista_en?: string | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_incumplimiento?: string | null
          motivo_rechazo?: string | null
          no_recogida_en?: string | null
          observaciones?: string
          oferta_id?: string
          origen?: string
          precio_habitual_unitario?: number
          precio_unitario?: number
          rechazada_en?: string | null
          recogida_desde?: string
          recogida_hasta?: string
          solicitada_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripciones: {
        Row: {
          actualizado_en: string
          estado: Database["public"]["Enums"]["estado_suscripcion"]
          inicia_en: string
          negocio_id: string
          plan_id: string
          vence_en: string
        }
        Insert: {
          actualizado_en?: string
          estado?: Database["public"]["Enums"]["estado_suscripcion"]
          inicia_en?: string
          negocio_id: string
          plan_id: string
          vence_en: string
        }
        Update: {
          actualizado_en?: string
          estado?: Database["public"]["Enums"]["estado_suscripcion"]
          inicia_en?: string
          negocio_id?: string
          plan_id?: string
          vence_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: true
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ahorro_comprador: { Args: { uid: string }; Returns: number }
      calcular_puntaje_comprador: {
        Args: { uid: string }
        Returns: {
          cerradas: number
          puntaje: number
        }[]
      }
      calificaciones_negocio: {
        Args: { negocio_id: string }
        Returns: {
          aseo: number
          atencion: number
          calidad: number
          comentario: string
          creado_en: string
        }[]
      }
      cambiar_estado_reserva: {
        Args: {
          datos?: Json
          nuevo_estado: Database["public"]["Enums"]["estado_reserva"]
          reserva_id: string
        }
        Returns: Json
      }
      cambiar_logo_negocio: {
        Args: { p_logo_url: string; p_negocio_id: string }
        Returns: undefined
      }
      cerrar_vencidas: { Args: never; Returns: Json }
      contacto_negocios_comprador: {
        Args: never
        Returns: {
          negocio_id: string
          telefono_whatsapp: string
        }[]
      }
      dar_de_baja_interesado: { Args: { token: string }; Returns: boolean }
      editar_oferta: {
        Args: {
          p_categoria: Database["public"]["Enums"]["categoria"]
          p_contenido: string
          p_cupos_total: number
          p_formato: string
          p_foto_url: string
          p_lleva?: number
          p_oferta_id: string
          p_paga?: number
          p_precio_final: number
          p_precio_habitual: number
          p_recogida_desde: string
          p_recogida_hasta: string
          p_tamano?: string
          p_tiempo_preparacion_min: number
          p_titulo: string
        }
        Returns: {
          categoria: Database["public"]["Enums"]["categoria"]
          contenido: string
          creado_en: string
          cupos_disponibles: number
          cupos_total: number
          elaborado_en: string | null
          es_prueba: boolean
          estado: Database["public"]["Enums"]["estado_oferta"]
          formato: string
          foto_url: string
          id: string
          lleva: number | null
          negocio_id: string
          paga: number | null
          precio_final: number
          precio_habitual: number
          publicada_por: string | null
          recogida_desde: string
          recogida_hasta: string
          tamano: string | null
          tiempo_preparacion_min: number | null
          tipo: Database["public"]["Enums"]["tipo_oferta"]
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "ofertas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      es_miembro_negocio: { Args: { negocio: string }; Returns: boolean }
      estado_planes: {
        Args: { p_negocio?: string }
        Returns: {
          bloquea_en: string
          estado: Database["public"]["Enums"]["estado_suscripcion"]
          max_ofertas_activas: number
          negocio_es_prueba: boolean
          negocio_id: string
          negocio_nombre: string
          negocio_slug: string
          ofertas_activas: number
          plan_id: string
          plan_nombre: string
          precio_mensual: number
          vence_en: string
        }[]
      }
      has_role: {
        Args: { rol: Database["public"]["Enums"]["app_role"]; uid: string }
        Returns: boolean
      }
      incumplimientos_recientes: {
        Args: never
        Returns: {
          negocio_id: string
          total: number
        }[]
      }
      marcar_suscripciones_vencidas: { Args: never; Returns: number }
      mis_reservas: {
        Args: never
        Returns: {
          calificada: boolean
          cantidad: number
          codigo: string
          confirmada_en: string
          entregada_en: string
          estado: Database["public"]["Enums"]["estado_reserva"]
          formato: string
          foto_url: string
          id: string
          incumplida_por: string
          lista_en: string
          lleva: number
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          motivo_incumplimiento: string
          motivo_rechazo: string
          negocio_direccion: string
          negocio_id: string
          negocio_logo_url: string
          negocio_nombre: string
          negocio_slug: string
          observaciones: string
          oferta_id: string
          paga: number
          precio_habitual_unitario: number
          precio_unitario: number
          recogida_desde: string
          recogida_hasta: string
          solicitada_en: string
          tamano: string
          titulo: string
        }[]
      }
      no_pude_cumplir: {
        Args: { motivo: string; reserva_id: string }
        Returns: undefined
      }
      oferta_tiene_reservas: { Args: { oferta: string }; Returns: boolean }
      publicar_programadas: { Args: never; Returns: number }
      puede_escribir_foto: { Args: { nombre: string }; Returns: boolean }
      puntaje_comprador: {
        Args: { uid: string }
        Returns: {
          cerradas: number
          puntaje: number
        }[]
      }
      registrar_pago_mensualidad: {
        Args: {
          p_meses?: number
          p_metodo: string
          p_negocio: string
          p_nota?: string
          p_plan: string
          p_valor: number
        }
        Returns: {
          creado_en: string
          id: string
          metodo: string
          negocio_id: string
          nota: string
          periodo_desde: string
          periodo_hasta: string
          plan_id: string
          registrado_por: string | null
          valor: number
        }
        SetofOptions: {
          from: "*"
          to: "pagos_mensualidad"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_vista: {
        Args: { oferta_id: string; origen?: string }
        Returns: undefined
      }
      reservas_negocio: {
        Args: { negocio_id: string }
        Returns: {
          cantidad: number
          cerradas_comprador: number
          codigo: string
          confirmada_en: string
          entregada_en: string
          estado: Database["public"]["Enums"]["estado_reserva"]
          id: string
          incumplida_por: string
          lista_en: string
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          motivo_incumplimiento: string
          motivo_rechazo: string
          nombre_comprador: string
          observaciones: string
          oferta_id: string
          precio_unitario: number
          puntaje_comprador: number
          recogida_desde: string
          recogida_hasta: string
          solicitada_en: string
          titulo: string
        }[]
      }
      resumen_calificaciones: {
        Args: { negocio_ids: string[] }
        Returns: {
          negocio_id: string
          promedio: number
          total: number
        }[]
      }
      solicitar_reserva: {
        Args: {
          cantidad: number
          observaciones?: string
          oferta_id: string
          origen?: string
        }
        Returns: {
          cancelada_en: string | null
          cantidad: number
          codigo: string | null
          comprador_id: string
          confirmada_en: string | null
          entregada_en: string | null
          estado: Database["public"]["Enums"]["estado_reserva"]
          id: string
          incumplida_por: string | null
          lista_en: string | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_incumplimiento: string | null
          motivo_rechazo: string | null
          no_recogida_en: string | null
          observaciones: string
          oferta_id: string
          origen: string
          precio_habitual_unitario: number
          precio_unitario: number
          rechazada_en: string | null
          recogida_desde: string
          recogida_hasta: string
          solicitada_en: string
        }
        SetofOptions: {
          from: "*"
          to: "reservas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "comprador" | "negocio" | "admin"
      categoria:
        | "desayuno"
        | "almuerzo"
        | "panaderia_pasteleria"
        | "cafe"
        | "comida_rapida"
        | "saludable"
        | "postres"
        | "bebidas"
        | "otro"
      estado_oferta: "borrador" | "activa" | "agotada" | "cerrada"
      estado_reserva:
        | "solicitada"
        | "confirmada"
        | "rechazada"
        | "cancelada"
        | "lista"
        | "entregada"
        | "no_recogida"
      estado_suscripcion: "prueba" | "activa" | "vencida" | "suspendida"
      metodo_pago: "efectivo" | "nequi" | "transferencia" | "tarjeta"
      tipo_evento:
        | "view_item"
        | "reserva_solicitada"
        | "reserva_confirmada"
        | "reserva_entregada"
        | "no_recogida"
        | "reserva_cancelada"
        | "reserva_rechazada"
        | "reserva_lista"
      tipo_oferta: "comercial" | "lote"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["comprador", "negocio", "admin"],
      categoria: [
        "desayuno",
        "almuerzo",
        "panaderia_pasteleria",
        "cafe",
        "comida_rapida",
        "saludable",
        "postres",
        "bebidas",
        "otro",
      ],
      estado_oferta: ["borrador", "activa", "agotada", "cerrada"],
      estado_reserva: [
        "solicitada",
        "confirmada",
        "rechazada",
        "cancelada",
        "lista",
        "entregada",
        "no_recogida",
      ],
      estado_suscripcion: ["prueba", "activa", "vencida", "suspendida"],
      metodo_pago: ["efectivo", "nequi", "transferencia", "tarjeta"],
      tipo_evento: [
        "view_item",
        "reserva_solicitada",
        "reserva_confirmada",
        "reserva_entregada",
        "no_recogida",
        "reserva_cancelada",
        "reserva_rechazada",
        "reserva_lista",
      ],
      tipo_oferta: ["comercial", "lote"],
    },
  },
} as const
