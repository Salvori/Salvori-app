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
          foto_url: string
          id: string
          negocio_id: string
          precio_final: number
          precio_habitual: number
          publicada_por: string | null
          recogida_desde: string
          recogida_hasta: string
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
          foto_url: string
          id?: string
          negocio_id: string
          precio_final: number
          precio_habitual: number
          publicada_por?: string | null
          recogida_desde: string
          recogida_hasta: string
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
          foto_url?: string
          id?: string
          negocio_id?: string
          precio_final?: number
          precio_habitual?: number
          publicada_por?: string | null
          recogida_desde?: string
          recogida_hasta?: string
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
          lista_en: string | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
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
          lista_en?: string | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
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
          lista_en?: string | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
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
      cerrar_vencidas: { Args: never; Returns: Json }
      es_miembro_negocio: { Args: { negocio: string }; Returns: boolean }
      has_role: {
        Args: { rol: Database["public"]["Enums"]["app_role"]; uid: string }
        Returns: boolean
      }
      oferta_tiene_reservas: { Args: { oferta: string }; Returns: boolean }
      publicar_programadas: { Args: never; Returns: number }
      puede_escribir_foto: { Args: { nombre: string }; Returns: boolean }
      registrar_vista: {
        Args: { oferta_id: string; origen?: string }
        Returns: undefined
      }
      reservas_negocio: {
        Args: { negocio_id: string }
        Returns: {
          cantidad: number
          codigo: string
          confirmada_en: string
          entregada_en: string
          estado: Database["public"]["Enums"]["estado_reserva"]
          id: string
          lista_en: string
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          motivo_rechazo: string
          nombre_comprador: string
          observaciones: string
          oferta_id: string
          precio_unitario: number
          recogida_desde: string
          recogida_hasta: string
          solicitada_en: string
          titulo: string
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
          lista_en: string | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
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
