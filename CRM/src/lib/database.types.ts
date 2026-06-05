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
      api_quota_log: {
        Row: {
          calls: number
          source: string
          updated_at: string
          year_month: string
        }
        Insert: {
          calls?: number
          source: string
          updated_at?: string
          year_month: string
        }
        Update: {
          calls?: number
          source?: string
          updated_at?: string
          year_month?: string
        }
        Relationships: []
      }
      contact_suggestions: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          entreprise_id: string
          id: string
          merged_contact_id: string | null
          nom: string | null
          notes: string | null
          prenom: string | null
          resolved_at: string | null
          resolved_by: string | null
          role_fonction: string | null
          statut: string
          telephone: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          entreprise_id: string
          id?: string
          merged_contact_id?: string | null
          nom?: string | null
          notes?: string | null
          prenom?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          role_fonction?: string | null
          statut?: string
          telephone?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          entreprise_id?: string
          id?: string
          merged_contact_id?: string | null
          nom?: string | null
          notes?: string | null
          prenom?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          role_fonction?: string | null
          statut?: string
          telephone?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_suggestions_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_suggestions_merged_contact_id_fkey"
            columns: ["merged_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_suggestions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "prospect_visits"
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
      cost_audit_runs: {
        Row: {
          breakdown: Json
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          feature: string
          finished_at: string | null
          id: string
          model: string
          run_id: string
          started_at: string
          status: string
          total_cache_creation_tokens: number
          total_cache_read_tokens: number
          total_eur: number
          total_input_tokens: number
          total_output_tokens: number
          total_usd: number
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          feature: string
          finished_at?: string | null
          id?: string
          model: string
          run_id: string
          started_at: string
          status?: string
          total_cache_creation_tokens?: number
          total_cache_read_tokens?: number
          total_eur?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_usd?: number
        }
        Update: {
          breakdown?: Json
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          feature?: string
          finished_at?: string | null
          id?: string
          model?: string
          run_id?: string
          started_at?: string
          status?: string
          total_cache_creation_tokens?: number
          total_cache_read_tokens?: number
          total_eur?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_usd?: number
        }
        Relationships: []
      }
      decoupe_chantiers: {
        Row: {
          client: string | null
          created_at: string
          created_by: string | null
          id: string
          nom: string
          statut: string
          updated_at: string
        }
        Insert: {
          client?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nom: string
          statut?: string
          updated_at?: string
        }
        Update: {
          client?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nom?: string
          statut?: string
          updated_at?: string
        }
        Relationships: []
      }
      decoupe_produits: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string | null
          fabricant: string | null
          famille: string
          fournisseur: string | null
          id: string
          jointage_autorise: boolean
          laizes_mm: number[]
          marge_pose_mm: number
          nestable: boolean
          nom: string
          notes: string | null
          orientation_imposee: boolean
          recouvrement_mm: number
          reference: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          fabricant?: string | null
          famille: string
          fournisseur?: string | null
          id?: string
          jointage_autorise?: boolean
          laizes_mm: number[]
          marge_pose_mm?: number
          nestable?: boolean
          nom: string
          notes?: string | null
          orientation_imposee?: boolean
          recouvrement_mm?: number
          reference: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          fabricant?: string | null
          famille?: string
          fournisseur?: string | null
          id?: string
          jointage_autorise?: boolean
          laizes_mm?: number[]
          marge_pose_mm?: number
          nestable?: boolean
          nom?: string
          notes?: string | null
          orientation_imposee?: boolean
          recouvrement_mm?: number
          reference?: string
          updated_at?: string
        }
        Relationships: []
      }
      decoupe_vitres: {
        Row: {
          chantier_id: string
          created_at: string
          hauteur_mm: number
          id: string
          largeur_mm: number
          produit_id: string
          quantite: number
          sur_mesure_fournisseur: boolean
          type_vitrage: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string
          hauteur_mm: number
          id?: string
          largeur_mm: number
          produit_id: string
          quantite?: number
          sur_mesure_fournisseur?: boolean
          type_vitrage?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string
          hauteur_mm?: number
          id?: string
          largeur_mm?: number
          produit_id?: string
          quantite?: number
          sur_mesure_fournisseur?: boolean
          type_vitrage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decoupe_vitres_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "decoupe_chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decoupe_vitres_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "decoupe_produits"
            referencedColumns: ["id"]
          },
        ]
      }
      entreprises: {
        Row: {
          adresse_siege: string | null
          archivee_at: string | null
          canton: string | null
          date_derniere_modification: string | null
          date_derniere_verification_zefix: string | null
          date_import_ajout: string | null
          id: string
          motif_archivage: string | null
          notes_libres: string | null
          numero_ide: string | null
          raison_sociale: string
          responsable_filmpro: string | null
          score_priorite: number | null
          secteur_activite: string | null
          segment_cible: string | null
          site_web: string | null
          source: string | null
          statut_archive: boolean
          statut_qualification: string | null
          tags: string | null
          taille_estimee: string | null
        }
        Insert: {
          adresse_siege?: string | null
          archivee_at?: string | null
          canton?: string | null
          date_derniere_modification?: string | null
          date_derniere_verification_zefix?: string | null
          date_import_ajout?: string | null
          id: string
          motif_archivage?: string | null
          notes_libres?: string | null
          numero_ide?: string | null
          raison_sociale: string
          responsable_filmpro?: string | null
          score_priorite?: number | null
          secteur_activite?: string | null
          segment_cible?: string | null
          site_web?: string | null
          source?: string | null
          statut_archive?: boolean
          statut_qualification?: string | null
          tags?: string | null
          taille_estimee?: string | null
        }
        Update: {
          adresse_siege?: string | null
          archivee_at?: string | null
          canton?: string | null
          date_derniere_modification?: string | null
          date_derniere_verification_zefix?: string | null
          date_import_ajout?: string | null
          id?: string
          motif_archivage?: string | null
          notes_libres?: string | null
          numero_ide?: string | null
          raison_sociale?: string
          responsable_filmpro?: string | null
          score_priorite?: number | null
          secteur_activite?: string | null
          segment_cible?: string | null
          site_web?: string | null
          source?: string | null
          statut_archive?: boolean
          statut_qualification?: string | null
          tags?: string | null
          taille_estimee?: string | null
        }
        Relationships: []
      }
      feedback_entries: {
        Row: {
          admin_notes: string | null
          context: Json
          created_at: string
          created_by: string | null
          created_by_email: string
          description: string
          id: string
          page: string
          severity: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          context?: Json
          created_at?: string
          created_by?: string | null
          created_by_email: string
          description: string
          id?: string
          page: string
          severity?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          context?: Json
          created_at?: string
          created_by?: string | null
          created_by_email?: string
          description?: string
          id?: string
          page?: string
          severity?: string | null
          status?: string
          type?: string
          updated_at?: string
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
      intelligence_reads: {
        Row: {
          read_at: string
          report_id: string
          user_id: string
        }
        Insert: {
          read_at?: string
          report_id: string
          user_id: string
        }
        Update: {
          read_at?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_reads_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "intelligence_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_reports: {
        Row: {
          archived_at: string | null
          compliance_tag: string
          error_message: string | null
          executive_summary: string
          generated_at: string
          id: string
          impacts_filmpro: Json
          items: Json
          items_hidden: Json
          raw_response: Json | null
          search_terms: Json
          status: string
          version: number
          week_label: string
        }
        Insert: {
          archived_at?: string | null
          compliance_tag: string
          error_message?: string | null
          executive_summary: string
          generated_at?: string
          id?: string
          impacts_filmpro: Json
          items: Json
          items_hidden?: Json
          raw_response?: Json | null
          search_terms: Json
          status?: string
          version?: number
          week_label: string
        }
        Update: {
          archived_at?: string | null
          compliance_tag?: string
          error_message?: string | null
          executive_summary?: string
          generated_at?: string
          id?: string
          impacts_filmpro?: Json
          items?: Json
          items_hidden?: Json
          raw_response?: Json | null
          search_terms?: Json
          status?: string
          version?: number
          week_label?: string
        }
        Relationships: []
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
      prospect_lead_signals: {
        Row: {
          applied_at: string
          compliance_tag: string
          item_rank: number
          lead_id: string
          match_kind: string
          match_term: string | null
          maturity: string
          report_id: string
          signal_generated_at: string
        }
        Insert: {
          applied_at?: string
          compliance_tag: string
          item_rank: number
          lead_id: string
          match_kind: string
          match_term?: string | null
          maturity: string
          report_id: string
          signal_generated_at: string
        }
        Update: {
          applied_at?: string
          compliance_tag?: string
          item_rank?: number
          lead_id?: string
          match_kind?: string
          match_term?: string | null
          maturity?: string
          report_id?: string
          signal_generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_lead_signals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "prospect_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_lead_signals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "intelligence_reports"
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
          source_intelligence_id: string | null
          source_intelligence_term: string | null
          source_url: string | null
          statut: string
          telephone: string | null
          transfere_vers_contact_id: string | null
          transfere_vers_entreprise_id: string | null
          triage_snoozed_until: string | null
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
          source_intelligence_id?: string | null
          source_intelligence_term?: string | null
          source_url?: string | null
          statut?: string
          telephone?: string | null
          transfere_vers_contact_id?: string | null
          transfere_vers_entreprise_id?: string | null
          triage_snoozed_until?: string | null
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
          source_intelligence_id?: string | null
          source_intelligence_term?: string | null
          source_url?: string | null
          statut?: string
          telephone?: string | null
          transfere_vers_contact_id?: string | null
          transfere_vers_entreprise_id?: string | null
          triage_snoozed_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_leads_source_intelligence_id_fkey"
            columns: ["source_intelligence_id"]
            isOneToOne: false
            referencedRelation: "intelligence_reports"
            referencedColumns: ["id"]
          },
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
      prospect_photos: {
        Row: {
          caption: string | null
          entreprise_id: string | null
          id: string
          mime_type: string | null
          prospect_lead_id: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          entreprise_id?: string | null
          id?: string
          mime_type?: string | null
          prospect_lead_id?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          entreprise_id?: string | null
          id?: string
          mime_type?: string | null
          prospect_lead_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_photos_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_photos_prospect_lead_id_fkey"
            columns: ["prospect_lead_id"]
            isOneToOne: false
            referencedRelation: "prospect_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_visits: {
        Row: {
          accuracy_m: number | null
          address_resolved: string | null
          distance_from_zefix_m: number | null
          entreprise_id: string | null
          id: string
          lat: number | null
          lng: number | null
          note: string | null
          prospect_lead_id: string | null
          resultat: string | null
          user_id: string | null
          visited_at: string
        }
        Insert: {
          accuracy_m?: number | null
          address_resolved?: string | null
          distance_from_zefix_m?: number | null
          entreprise_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          prospect_lead_id?: string | null
          resultat?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          accuracy_m?: number | null
          address_resolved?: string | null
          distance_from_zefix_m?: number | null
          entreprise_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          prospect_lead_id?: string | null
          resultat?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_visits_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_visits_prospect_lead_id_fkey"
            columns: ["prospect_lead_id"]
            isOneToOne: false
            referencedRelation: "prospect_leads"
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
      veille_themes: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string
          id: string
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description: string
          id?: string
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      api_quota_increment: {
        Args: { p_by?: number; p_source: string; p_year_month: string }
        Returns: number
      }
      entreprises_lookup_by_name: {
        Args: { p_query: string }
        Returns: {
          id: string
          raison_sociale: string
        }[]
      }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transfer_lead_to_crm: { Args: { p_lead_id: string }; Returns: Json }
      unaccent: { Args: { "": string }; Returns: string }
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
  public: {
    Enums: {},
  },
} as const
