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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activites: {
        Row: {
          auteur_id: string | null
          contact_id: string | null
          date_heure: string
          date_prochaine_action: string | null
          id: string
          opportunite_id: string | null
          prochaine_action: string | null
          resume_contenu: string | null
          type_activite: string
        }
        Insert: {
          auteur_id?: string | null
          contact_id?: string | null
          date_heure?: string
          date_prochaine_action?: string | null
          id: string
          opportunite_id?: string | null
          prochaine_action?: string | null
          resume_contenu?: string | null
          type_activite: string
        }
        Update: {
          auteur_id?: string | null
          contact_id?: string | null
          date_heure?: string
          date_prochaine_action?: string | null
          id?: string
          opportunite_id?: string | null
          prochaine_action?: string | null
          resume_contenu?: string | null
          type_activite?: string
        }
        Relationships: [
          {
            foreignKeyName: "activites_auteur_id_fkey"
            columns: ["auteur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activites_opportunite_id_fkey"
            columns: ["opportunite_id"]
            isOneToOne: false
            referencedRelation: "opportunites"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          adresse: string | null
          canton: string | null
          date_ajout: string | null
          date_dernier_echange: string | null
          date_derniere_modification: string | null
          doublon_detecte: boolean | null
          email_professionnel: string | null
          entreprise_id: string | null
          est_prescripteur: boolean | null
          fiche_fusionnee_avec: string | null
          id: string
          nom: string | null
          notes_libres: string | null
          prenom: string | null
          responsable_filmpro: string | null
          role_fonction: string | null
          score_priorite: number | null
          segment: string | null
          source: string | null
          statut_archive: boolean | null
          statut_email: string | null
          statut_qualification: string | null
          tags: string | null
          telephone: string | null
        }
        Insert: {
          adresse?: string | null
          canton?: string | null
          date_ajout?: string | null
          date_dernier_echange?: string | null
          date_derniere_modification?: string | null
          doublon_detecte?: boolean | null
          email_professionnel?: string | null
          entreprise_id?: string | null
          est_prescripteur?: boolean | null
          fiche_fusionnee_avec?: string | null
          id: string
          nom?: string | null
          notes_libres?: string | null
          prenom?: string | null
          responsable_filmpro?: string | null
          role_fonction?: string | null
          score_priorite?: number | null
          segment?: string | null
          source?: string | null
          statut_archive?: boolean | null
          statut_email?: string | null
          statut_qualification?: string | null
          tags?: string | null
          telephone?: string | null
        }
        Update: {
          adresse?: string | null
          canton?: string | null
          date_ajout?: string | null
          date_dernier_echange?: string | null
          date_derniere_modification?: string | null
          doublon_detecte?: boolean | null
          email_professionnel?: string | null
          entreprise_id?: string | null
          est_prescripteur?: boolean | null
          fiche_fusionnee_avec?: string | null
          id?: string
          nom?: string | null
          notes_libres?: string | null
          prenom?: string | null
          responsable_filmpro?: string | null
          role_fonction?: string | null
          score_priorite?: number | null
          segment?: string | null
          source?: string | null
          statut_archive?: boolean | null
          statut_email?: string | null
          statut_qualification?: string | null
          tags?: string | null
          telephone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      entreprises: {
        Row: {
          adresse_siege: string | null
          canton: string | null
          date_derniere_modification: string | null
          date_import_ajout: string | null
          id: string
          notes_libres: string | null
          numero_ide: string | null
          raison_sociale: string
          responsable_filmpro: string | null
          score_priorite: number | null
          secteur_activite: string | null
          segment_cible: string | null
          site_web: string | null
          source: string | null
          statut_qualification: string | null
          tags: string | null
          taille_estimee: string | null
        }
        Insert: {
          adresse_siege?: string | null
          canton?: string | null
          date_derniere_modification?: string | null
          date_import_ajout?: string | null
          id: string
          notes_libres?: string | null
          numero_ide?: string | null
          raison_sociale: string
          responsable_filmpro?: string | null
          score_priorite?: number | null
          secteur_activite?: string | null
          segment_cible?: string | null
          site_web?: string | null
          source?: string | null
          statut_qualification?: string | null
          tags?: string | null
          taille_estimee?: string | null
        }
        Update: {
          adresse_siege?: string | null
          canton?: string | null
          date_derniere_modification?: string | null
          date_import_ajout?: string | null
          id?: string
          notes_libres?: string | null
          numero_ide?: string | null
          raison_sociale?: string
          responsable_filmpro?: string | null
          score_priorite?: number | null
          secteur_activite?: string | null
          segment_cible?: string | null
          site_web?: string | null
          source?: string | null
          statut_qualification?: string | null
          tags?: string | null
          taille_estimee?: string | null
        }
        Relationships: []
      }
      imports_zefix: {
        Row: {
          cantons_filtres: string | null
          date_import: string
          id: string
          nb_doublons_detectes: number | null
          nb_entreprises_importees: number | null
          nb_nouvelles_fiches: number | null
          notes_campagne: string | null
          realise_par_id: string | null
          secteurs_filtres: string | null
          statut_import: string | null
        }
        Insert: {
          cantons_filtres?: string | null
          date_import?: string
          id: string
          nb_doublons_detectes?: number | null
          nb_entreprises_importees?: number | null
          nb_nouvelles_fiches?: number | null
          notes_campagne?: string | null
          realise_par_id?: string | null
          secteurs_filtres?: string | null
          statut_import?: string | null
        }
        Update: {
          cantons_filtres?: string | null
          date_import?: string
          id?: string
          nb_doublons_detectes?: number | null
          nb_entreprises_importees?: number | null
          nb_nouvelles_fiches?: number | null
          notes_campagne?: string | null
          realise_par_id?: string | null
          secteurs_filtres?: string | null
          statut_import?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imports_zefix_realise_par_id_fkey"
            columns: ["realise_par_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunites: {
        Row: {
          contact_id: string | null
          date_cloture_effective: string | null
          date_creation: string | null
          date_derniere_modification: string | null
          date_relance_prevue: string | null
          entreprise_id: string | null
          etape_pipeline: string | null
          id: string
          lie_signal_affaires: boolean | null
          montant_estime: number | null
          motif_perte: string | null
          notes_libres: string | null
          prescripteur_origine: string | null
          responsable: string | null
          signal_affaires_id: string | null
          tags: string | null
          titre: string
        }
        Insert: {
          contact_id?: string | null
          date_cloture_effective?: string | null
          date_creation?: string | null
          date_derniere_modification?: string | null
          date_relance_prevue?: string | null
          entreprise_id?: string | null
          etape_pipeline?: string | null
          id: string
          lie_signal_affaires?: boolean | null
          montant_estime?: number | null
          motif_perte?: string | null
          notes_libres?: string | null
          prescripteur_origine?: string | null
          responsable?: string | null
          signal_affaires_id?: string | null
          tags?: string | null
          titre: string
        }
        Update: {
          contact_id?: string | null
          date_cloture_effective?: string | null
          date_creation?: string | null
          date_derniere_modification?: string | null
          date_relance_prevue?: string | null
          entreprise_id?: string | null
          etape_pipeline?: string | null
          id?: string
          lie_signal_affaires?: boolean | null
          montant_estime?: number | null
          motif_perte?: string | null
          notes_libres?: string | null
          prescripteur_origine?: string | null
          responsable?: string | null
          signal_affaires_id?: string | null
          tags?: string | null
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunites_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunites_signal_affaires_id_fkey"
            columns: ["signal_affaires_id"]
            isOneToOne: false
            referencedRelation: "signaux_affaires"
            referencedColumns: ["id"]
          },
        ]
      }
      prescripteurs: {
        Row: {
          contact_id: string | null
          date_ajout_prescripteur: string | null
          date_derniere_recommandation: string | null
          id: string
          nb_affaires_en_cours: number | null
          nb_affaires_gagnees: number | null
          nb_affaires_recommandees: number | null
          niveau_activite: string | null
          notes_relation: string | null
          valeur_totale_generee: number | null
        }
        Insert: {
          contact_id?: string | null
          date_ajout_prescripteur?: string | null
          date_derniere_recommandation?: string | null
          id: string
          nb_affaires_en_cours?: number | null
          nb_affaires_gagnees?: number | null
          nb_affaires_recommandees?: number | null
          niveau_activite?: string | null
          notes_relation?: string | null
          valeur_totale_generee?: number | null
        }
        Update: {
          contact_id?: string | null
          date_ajout_prescripteur?: string | null
          date_derniere_recommandation?: string | null
          id?: string
          nb_affaires_en_cours?: number | null
          nb_affaires_gagnees?: number | null
          nb_affaires_recommandees?: number | null
          niveau_activite?: string | null
          notes_relation?: string | null
          valeur_totale_generee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescripteurs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_leads: {
        Row: {
          adresse: string | null
          canton: string | null
          date_import: string
          date_modification: string
          date_publication: string | null
          description: string | null
          email: string | null
          id: string
          localite: string | null
          montant: number | null
          mots_cles_match: string[] | null
          nom_contact: string | null
          npa: string | null
          raison_sociale: string
          score_pertinence: number | null
          secteur_detecte: string | null
          site_web: string | null
          source: string
          source_id: string | null
          source_url: string | null
          statut: string
          telephone: string | null
          transfere_vers_contact_id: string | null
          transfere_vers_entreprise_id: string | null
        }
        Insert: {
          adresse?: string | null
          canton?: string | null
          date_import?: string
          date_modification?: string
          date_publication?: string | null
          description?: string | null
          email?: string | null
          id?: string
          localite?: string | null
          montant?: number | null
          mots_cles_match?: string[] | null
          nom_contact?: string | null
          npa?: string | null
          raison_sociale: string
          score_pertinence?: number | null
          secteur_detecte?: string | null
          site_web?: string | null
          source: string
          source_id?: string | null
          source_url?: string | null
          statut?: string
          telephone?: string | null
          transfere_vers_contact_id?: string | null
          transfere_vers_entreprise_id?: string | null
        }
        Update: {
          adresse?: string | null
          canton?: string | null
          date_import?: string
          date_modification?: string
          date_publication?: string | null
          description?: string | null
          email?: string | null
          id?: string
          localite?: string | null
          montant?: number | null
          mots_cles_match?: string[] | null
          nom_contact?: string | null
          npa?: string | null
          raison_sociale?: string
          score_pertinence?: number | null
          secteur_detecte?: string | null
          site_web?: string | null
          source?: string
          source_id?: string | null
          source_url?: string | null
          statut?: string
          telephone?: string | null
          transfere_vers_contact_id?: string | null
          transfere_vers_entreprise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_leads_transfere_vers_contact_id_fkey"
            columns: ["transfere_vers_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_leads_transfere_vers_entreprise_id_fkey"
            columns: ["transfere_vers_entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      recherches_sauvegardees: {
        Row: {
          alerte_active: boolean | null
          cantons: string[] | null
          date_creation: string
          dernier_check: string | null
          frequence_alerte: string | null
          id: string
          mots_cles: string[] | null
          nb_nouveaux: number | null
          nom: string
          score_minimum: number | null
          secteurs: string[] | null
          sources: string[] | null
          temperatures: string[] | null
        }
        Insert: {
          alerte_active?: boolean | null
          cantons?: string[] | null
          date_creation?: string
          dernier_check?: string | null
          frequence_alerte?: string | null
          id?: string
          mots_cles?: string[] | null
          nb_nouveaux?: number | null
          nom: string
          score_minimum?: number | null
          secteurs?: string[] | null
          sources?: string[] | null
          temperatures?: string[] | null
        }
        Update: {
          alerte_active?: boolean | null
          cantons?: string[] | null
          date_creation?: string
          dernier_check?: string | null
          frequence_alerte?: string | null
          id?: string
          mots_cles?: string[] | null
          nb_nouveaux?: number | null
          nom?: string
          score_minimum?: number | null
          secteurs?: string[] | null
          sources?: string[] | null
          temperatures?: string[] | null
        }
        Relationships: []
      }
      signaux_affaires: {
        Row: {
          architecte_bureau: string | null
          canton: string | null
          commune: string | null
          contact_maitre_ouvrage_id: string | null
          date_detection: string | null
          date_publication: string | null
          description_projet: string | null
          id: string
          maitre_ouvrage: string | null
          notes_libres: string | null
          opportunite_associee_id: string | null
          responsable_filmpro: string | null
          score_pertinence: number | null
          source_id: string | null
          source_officielle: string | null
          statut_traitement: string | null
          type_signal: string | null
        }
        Insert: {
          architecte_bureau?: string | null
          canton?: string | null
          commune?: string | null
          contact_maitre_ouvrage_id?: string | null
          date_detection?: string | null
          date_publication?: string | null
          description_projet?: string | null
          id: string
          maitre_ouvrage?: string | null
          notes_libres?: string | null
          opportunite_associee_id?: string | null
          responsable_filmpro?: string | null
          score_pertinence?: number | null
          source_id?: string | null
          source_officielle?: string | null
          statut_traitement?: string | null
          type_signal?: string | null
        }
        Update: {
          architecte_bureau?: string | null
          canton?: string | null
          commune?: string | null
          contact_maitre_ouvrage_id?: string | null
          date_detection?: string | null
          date_publication?: string | null
          description_projet?: string | null
          id?: string
          maitre_ouvrage?: string | null
          notes_libres?: string | null
          opportunite_associee_id?: string | null
          responsable_filmpro?: string | null
          score_pertinence?: number | null
          source_id?: string | null
          source_officielle?: string | null
          statut_traitement?: string | null
          type_signal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_signaux_opportunite"
            columns: ["opportunite_associee_id"]
            isOneToOne: false
            referencedRelation: "opportunites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signaux_affaires_contact_maitre_ouvrage_id_fkey"
            columns: ["contact_maitre_ouvrage_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      utilisateurs: {
        Row: {
          actif: boolean
          date_ajout: string
          email_connexion: string
          id: string
          niveau_acces: string
          nom: string
          prenom: string
          role: string
        }
        Insert: {
          actif?: boolean
          date_ajout?: string
          email_connexion: string
          id: string
          niveau_acces?: string
          nom: string
          prenom: string
          role?: string
        }
        Update: {
          actif?: boolean
          date_ajout?: string
          email_connexion?: string
          id?: string
          niveau_acces?: string
          nom?: string
          prenom?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
