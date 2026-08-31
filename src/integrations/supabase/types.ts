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
      ad_campaigns: {
        Row: {
          clicks: number | null
          conversions: number | null
          created_at: string
          id: string
          impressions: number | null
          name: string
          platform: string
          revenue: number | null
          spend: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          name: string
          platform: string
          revenue?: number | null
          spend?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          name?: string
          platform?: string
          revenue?: number | null
          spend?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details: Json
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          author: string | null
          created_at: string | null
          html_content: string
          id: string
          published: boolean | null
          published_at: string | null
          seo_description: string | null
          slug: string
          title: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string | null
          html_content: string
          id?: string
          published?: boolean | null
          published_at?: string | null
          seo_description?: string | null
          slug: string
          title: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string | null
          html_content?: string
          id?: string
          published?: boolean | null
          published_at?: string | null
          seo_description?: string | null
          slug?: string
          title?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      call_reminders: {
        Row: {
          amount_or_context: string | null
          call_sid: string | null
          client_name: string
          created_at: string
          due_date: string
          id: string
          is_active: boolean | null
          language: string | null
          phone_number: string
          reminder_type: string | null
          script_template: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount_or_context?: string | null
          call_sid?: string | null
          client_name: string
          created_at?: string
          due_date: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          phone_number: string
          reminder_type?: string | null
          script_template?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount_or_context?: string | null
          call_sid?: string | null
          client_name?: string
          created_at?: string
          due_date?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          phone_number?: string
          reminder_type?: string | null
          script_template?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          content: string | null
          created_at: string
          id: string
          name: string
          sent_count: number | null
          status: string | null
          total_recipients: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          name: string
          sent_count?: number | null
          status?: string | null
          total_recipients?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          name?: string
          sent_count?: number | null
          status?: string | null
          total_recipients?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_queries: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          user_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          user_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creatives: {
        Row: {
          created_at: string
          id: string
          image_url: string
          prompt: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          prompt?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          prompt?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          lifecycle_stage: string | null
          notes: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          lifecycle_stage?: string | null
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          lifecycle_stage?: string | null
          notes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          ai_draft: string | null
          ai_score: number | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          last_interaction: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_draft?: string | null
          ai_score?: number | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_interaction?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_draft?: string | null
          ai_score?: number | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_interaction?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_messages: {
        Row: {
          content: string
          created_at: string | null
          direction: string
          id: string
          lead_id: string | null
          platform: string
        }
        Insert: {
          content: string
          created_at?: string | null
          direction: string
          id?: string
          lead_id?: string | null
          platform: string
        }
        Update: {
          content?: string
          created_at?: string | null
          direction?: string
          id?: string
          lead_id?: string | null
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_tokens: {
        Row: {
          connected: boolean | null
          created_at: string
          id: string
          refresh_token: string
          user_id: string | null
        }
        Insert: {
          connected?: boolean | null
          created_at?: string
          id?: string
          refresh_token: string
          user_id?: string | null
        }
        Update: {
          connected?: boolean | null
          created_at?: string
          id?: string
          refresh_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      launched_campaigns: {
        Row: {
          adCopy: string | null
          adHeadline: string | null
          adMediaName: string | null
          adMediaStorageId: string | null
          adMediaType: string | null
          audience: Json | null
          budget: number | null
          budgetType: string | null
          campaign_id: string | null
          created_at: string
          ctaButton: string | null
          destinationUrl: string | null
          errorMessage: string | null
          id: string
          name: string | null
          objective: string | null
          platform: string
          platformCampaignId: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          adCopy?: string | null
          adHeadline?: string | null
          adMediaName?: string | null
          adMediaStorageId?: string | null
          adMediaType?: string | null
          audience?: Json | null
          budget?: number | null
          budgetType?: string | null
          campaign_id?: string | null
          created_at?: string
          ctaButton?: string | null
          destinationUrl?: string | null
          errorMessage?: string | null
          id?: string
          name?: string | null
          objective?: string | null
          platform: string
          platformCampaignId?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          adCopy?: string | null
          adHeadline?: string | null
          adMediaName?: string | null
          adMediaStorageId?: string | null
          adMediaType?: string | null
          audience?: Json | null
          budget?: number | null
          budgetType?: string | null
          campaign_id?: string | null
          created_at?: string
          ctaButton?: string | null
          destinationUrl?: string | null
          errorMessage?: string | null
          id?: string
          name?: string | null
          objective?: string | null
          platform?: string
          platformCampaignId?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launched_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launched_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          autopilot: boolean | null
          contact: Json | null
          created_at: string
          email: string | null
          id: string
          intent: string | null
          is_scam: boolean | null
          is_urgent: boolean | null
          language: string | null
          last_message: string | null
          name: string
          phone: string | null
          platform: string | null
          scam_reason: string | null
          score: number | null
          source: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          autopilot?: boolean | null
          contact?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          intent?: string | null
          is_scam?: boolean | null
          is_urgent?: boolean | null
          language?: string | null
          last_message?: string | null
          name: string
          phone?: string | null
          platform?: string | null
          scam_reason?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          autopilot?: boolean | null
          contact?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          intent?: string | null
          is_scam?: boolean | null
          is_urgent?: boolean | null
          language?: string | null
          last_message?: string | null
          name?: string
          phone?: string | null
          platform?: string | null
          scam_reason?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_agent_data: {
        Row: {
          created_at: string
          id: string
          metric_name: string | null
          metric_value: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metric_name?: string | null
          metric_value?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metric_name?: string | null
          metric_value?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_agent_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      market_analyses: {
        Row: {
          analysis_data: Json
          created_at: string
          id: string
          query: string
          user_id: string | null
        }
        Insert: {
          analysis_data: Json
          created_at?: string
          id?: string
          query: string
          user_id?: string | null
        }
        Update: {
          analysis_data?: Json
          created_at?: string
          id?: string
          query?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string | null
          sender: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id?: string | null
          sender: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          sender?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          provider: string
          provider_payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          description?: string | null
          id?: string
          provider: string
          provider_payment_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ranking_agents_log: {
        Row: {
          action: string
          agent_name: string
          created_at: string
          id: string
          result: Json | null
          site_id: string
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          action: string
          agent_name: string
          created_at?: string
          id?: string
          result?: Json | null
          site_id: string
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          action?: string
          agent_name?: string
          created_at?: string
          id?: string
          result?: Json | null
          site_id?: string
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_agents_log_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ranking_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_agents_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_recommendations: {
        Row: {
          ai_impact: string | null
          ai_risk_assessment: string | null
          ai_safety_score: number | null
          ai_verdict: string | null
          approved_at: string | null
          category: string | null
          created_at: string
          done_at: string | null
          effort: string | null
          estimated_time: string | null
          id: string
          priority: string
          reason: string | null
          scan_id: string
          seo_impact: string | null
          site_id: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          ai_impact?: string | null
          ai_risk_assessment?: string | null
          ai_safety_score?: number | null
          ai_verdict?: string | null
          approved_at?: string | null
          category?: string | null
          created_at?: string
          done_at?: string | null
          effort?: string | null
          estimated_time?: string | null
          id?: string
          priority: string
          reason?: string | null
          scan_id: string
          seo_impact?: string | null
          site_id: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          ai_impact?: string | null
          ai_risk_assessment?: string | null
          ai_safety_score?: number | null
          ai_verdict?: string | null
          approved_at?: string | null
          category?: string | null
          created_at?: string
          done_at?: string | null
          effort?: string | null
          estimated_time?: string | null
          id?: string
          priority?: string
          reason?: string | null
          scan_id?: string
          seo_impact?: string | null
          site_id?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_recommendations_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "ranking_scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_recommendations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ranking_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_scans: {
        Row: {
          full_data: Json | null
          high_impact_tasks: Json | null
          id: string
          scanned_at: string
          score_ai_visibility: number | null
          score_authority: number | null
          score_llm_readiness: number | null
          score_seo_health: number | null
          site_id: string
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          full_data?: Json | null
          high_impact_tasks?: Json | null
          id?: string
          scanned_at?: string
          score_ai_visibility?: number | null
          score_authority?: number | null
          score_llm_readiness?: number | null
          score_seo_health?: number | null
          site_id: string
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          full_data?: Json | null
          high_impact_tasks?: Json | null
          id?: string
          scanned_at?: string
          score_ai_visibility?: number | null
          score_authority?: number | null
          score_llm_readiness?: number | null
          score_seo_health?: number | null
          site_id?: string
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_scans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ranking_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_sites: {
        Row: {
          api_keys: Json | null
          auto_scan: boolean | null
          created_at: string
          domain: string
          gsc_connected: boolean | null
          gsc_token: Json | null
          id: string
          last_scanned_at: string | null
          scan_frequency: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          api_keys?: Json | null
          auto_scan?: boolean | null
          created_at?: string
          domain: string
          gsc_connected?: boolean | null
          gsc_token?: Json | null
          id?: string
          last_scanned_at?: string | null
          scan_frequency?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          api_keys?: Json | null
          auto_scan?: boolean | null
          created_at?: string
          domain?: string
          gsc_connected?: boolean | null
          gsc_token?: Json | null
          id?: string
          last_scanned_at?: string | null
          scan_frequency?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ranking_sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rcs_agents: {
        Row: {
          brand_description: string | null
          brand_logo: string | null
          business_name: string
          created_at: string | null
          id: string
          privacy_policy_url: string | null
          provider: string
          status: string
          support_email: string | null
          support_phone: string | null
          terms_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand_description?: string | null
          brand_logo?: string | null
          business_name: string
          created_at?: string | null
          id?: string
          privacy_policy_url?: string | null
          provider?: string
          status?: string
          support_email?: string | null
          support_phone?: string | null
          terms_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand_description?: string | null
          brand_logo?: string | null
          business_name?: string
          created_at?: string | null
          id?: string
          privacy_policy_url?: string | null
          provider?: string
          status?: string
          support_email?: string | null
          support_phone?: string | null
          terms_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rcs_campaigns: {
        Row: {
          agent_id: string | null
          content: Json
          created_at: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          message_type: string
          name: string
          read_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          status: string
          total_contacts: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          content: Json
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message_type?: string
          name: string
          read_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          total_contacts?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          content?: Json
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message_type?: string
          name?: string
          read_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          total_contacts?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcs_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "rcs_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      rcs_contacts: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          is_opted_out: boolean | null
          last_messaged_at: string | null
          name: string | null
          opt_out_date: string | null
          phone_number: string
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          is_opted_out?: boolean | null
          last_messaged_at?: string | null
          name?: string | null
          opt_out_date?: string | null
          phone_number: string
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          is_opted_out?: boolean | null
          last_messaged_at?: string | null
          name?: string | null
          opt_out_date?: string | null
          phone_number?: string
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcs_contacts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "rcs_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      rcs_messages: {
        Row: {
          campaign_id: string | null
          contact_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcs_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "rcs_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcs_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "rcs_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      rcs_templates: {
        Row: {
          agent_id: string | null
          content: Json
          created_at: string | null
          id: string
          name: string
          provider_template_id: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          content: Json
          created_at?: string | null
          id?: string
          name: string
          provider_template_id?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          name?: string
          provider_template_id?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcs_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "rcs_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      reddit_accounts: {
        Row: {
          access_token: string | null
          auth_type: string
          client_id: string | null
          client_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          password: string | null
          refresh_token: string | null
          target_keywords: string[] | null
          target_subreddits: string[] | null
          updated_at: string
          user_id: string
          username: string | null
          website_url: string | null
        }
        Insert: {
          access_token?: string | null
          auth_type: string
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          password?: string | null
          refresh_token?: string | null
          target_keywords?: string[] | null
          target_subreddits?: string[] | null
          updated_at?: string
          user_id: string
          username?: string | null
          website_url?: string | null
        }
        Update: {
          access_token?: string | null
          auth_type?: string
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          password?: string | null
          refresh_token?: string | null
          target_keywords?: string[] | null
          target_subreddits?: string[] | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      seo_autopilot_settings: {
        Row: {
          created_at: string | null
          github_repo: string | null
          github_token: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          niche: string
          publish_plan: Json | null
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          github_repo?: string | null
          github_token?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          niche: string
          publish_plan?: Json | null
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          github_repo?: string | null
          github_token?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          niche?: string
          publish_plan?: Json | null
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_projects: {
        Row: {
          audit_data: Json | null
          created_at: string
          id: string
          keywords: string[] | null
          url: string
          user_id: string | null
        }
        Insert: {
          audit_data?: Json | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          url: string
          user_id?: string | null
        }
        Update: {
          audit_data?: Json | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_enrollments: {
        Row: {
          contact_id: string | null
          created_at: string
          current_step: number | null
          id: string
          sequence_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          current_step?: number | null
          id?: string
          sequence_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          current_step?: number | null
          id?: string
          sequence_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          steps: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          steps: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          steps?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          plan_name: string
          provider: string
          provider_subscription_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan_name: string
          provider: string
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan_name?: string
          provider?: string
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      token_balances: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      token_rates: {
        Row: {
          action_type: string
          display_name: string
          token_cost: number
          updated_at: string
        }
        Insert: {
          action_type: string
          display_name: string
          token_cost?: number
          updated_at?: string
        }
        Update: {
          action_type?: string
          display_name?: string
          token_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_phone_numbers: {
        Row: {
          created_at: string | null
          id: string
          phone_number: string
          status: string
          updated_at: string | null
          user_id: string
          vapi_phone_number_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone_number: string
          status?: string
          updated_at?: string | null
          user_id: string
          vapi_phone_number_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          phone_number?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          vapi_phone_number_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          credits: number | null
          dataforseo_login: string | null
          dataforseo_password: string | null
          email: string | null
          id: string
          meta_access_token: string | null
          name: string | null
          whatsapp_api_token: string | null
          whatsapp_business_account_id: string | null
          whatsapp_phone_id: string | null
        }
        Insert: {
          created_at?: string
          credits?: number | null
          dataforseo_login?: string | null
          dataforseo_password?: string | null
          email?: string | null
          id: string
          meta_access_token?: string | null
          name?: string | null
          whatsapp_api_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_phone_id?: string | null
        }
        Update: {
          created_at?: string
          credits?: number | null
          dataforseo_login?: string | null
          dataforseo_password?: string | null
          email?: string | null
          id?: string
          meta_access_token?: string | null
          name?: string | null
          whatsapp_api_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_phone_id?: string | null
        }
        Relationships: []
      }
      whatsapp_queue: {
        Row: {
          created_at: string
          id: string
          media_url: string | null
          message: string
          phone_number: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_url?: string | null
          message: string
          phone_number: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_url?: string | null
          message?: string
          phone_number?: string
          status?: string | null
          user_id?: string | null
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
