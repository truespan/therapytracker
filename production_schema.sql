--
-- PostgreSQL database dump
--

\restrict b9GxfO7dyL1TGrHObbzcJTmM98fFCp0fBDHbzcafhLQNpUOFuFyzypfgrfCAUbB

-- Dumped from database version 18.1 (Debian 18.1-1.pgdg12+2)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: ensure_monthly_plans_enabled(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_monthly_plans_enabled() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Force monthly plans to always be enabled
    NEW.individual_monthly_enabled := TRUE;
    NEW.organization_monthly_enabled := TRUE;
    RETURN NEW;
END;
$$;


--
-- Name: update_case_history_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_case_history_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_generated_report_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_generated_report_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_questionnaires_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_questionnaires_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_report_template_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_report_template_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_subscription_plans_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_subscription_plans_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_support_conversation_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_support_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE support_conversations
  SET updated_at = CURRENT_TIMESTAMP,
      last_message_at = CURRENT_TIMESTAMP
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_support_conversation_timestamp(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_support_conversation_timestamp() IS 'Automatically updates conversation timestamp when new message is added';


--
-- Name: update_whatsapp_notifications_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_whatsapp_notifications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE admins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admins IS 'Stores admin user information for system administration';


--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    appointment_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    duration_minutes integer DEFAULT 60,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    timezone character varying(100) DEFAULT 'UTC'::character varying,
    google_event_id character varying(255),
    google_sync_status character varying(20) DEFAULT 'pending'::character varying,
    google_last_synced_at timestamp without time zone,
    google_sync_error text,
    appointment_date_tz timestamp with time zone,
    end_date_tz timestamp with time zone,
    created_at_tz timestamp with time zone,
    updated_at_tz timestamp with time zone,
    encrypted_notes text,
    encryption_key_id character varying(100),
    encryption_version integer DEFAULT 1,
    CONSTRAINT appointments_google_sync_status_check CHECK (((google_sync_status)::text = ANY ((ARRAY['pending'::character varying, 'synced'::character varying, 'failed'::character varying, 'not_synced'::character varying])::text[]))),
    CONSTRAINT appointments_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE appointments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.appointments IS 'Stores partner appointments with clients - independent of therapy sessions';


--
-- Name: COLUMN appointments.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.timezone IS 'IANA timezone identifier for the user who created the appointment (e.g., America/New_York, Asia/Kolkata)';


--
-- Name: COLUMN appointments.google_event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.google_event_id IS 'Google Calendar event ID for synced appointments';


--
-- Name: COLUMN appointments.google_sync_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.google_sync_status IS 'Sync status: pending (not yet synced), synced (successful), failed (error occurred), not_synced (sync disabled or no Google connection)';


--
-- Name: COLUMN appointments.google_last_synced_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.google_last_synced_at IS 'Timestamp of last successful sync';


--
-- Name: COLUMN appointments.google_sync_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.google_sync_error IS 'Error message if sync failed';


--
-- Name: COLUMN appointments.appointment_date_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.appointment_date_tz IS 'Appointment start time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN appointments.end_date_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.end_date_tz IS 'Appointment end time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN appointments.created_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.created_at_tz IS 'Record creation time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN appointments.updated_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.appointments.updated_at_tz IS 'Record last update time (TIMESTAMPTZ) - Migration column';


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: encryption_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encryption_audit_log (
    id integer NOT NULL,
    operation character varying(50) NOT NULL,
    data_type character varying(50) NOT NULL,
    record_id integer,
    organization_id integer,
    user_id integer,
    user_role character varying(50),
    key_id character varying(100),
    key_version integer,
    ip_address inet,
    user_agent text,
    access_reason text,
    fields_accessed text[],
    success boolean DEFAULT true,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE encryption_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.encryption_audit_log IS 'Audit log for all encryption operations and PHI access (HIPAA requirement)';


--
-- Name: COLUMN encryption_audit_log.operation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encryption_audit_log.operation IS 'Type of operation performed (encrypt, decrypt, create, read, update, delete, etc.)';


--
-- Name: COLUMN encryption_audit_log.data_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encryption_audit_log.data_type IS 'Type of data accessed (case_history, mental_status, questionnaire, appointment, etc.)';


--
-- Name: COLUMN encryption_audit_log.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encryption_audit_log.ip_address IS 'IP address for tracking access location';


--
-- Name: COLUMN encryption_audit_log.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encryption_audit_log.user_agent IS 'User agent for tracking access device/browser';


--
-- Name: COLUMN encryption_audit_log.access_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encryption_audit_log.access_reason IS 'Business reason for accessing PHI (required by HIPAA)';


--
-- Name: COLUMN encryption_audit_log.fields_accessed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encryption_audit_log.fields_accessed IS 'Specific fields accessed for fine-grained auditing';


--
-- Name: audit_log_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.audit_log_summary AS
 SELECT date(created_at) AS audit_date,
    organization_id,
    data_type,
    operation,
    count(*) AS operation_count,
    count(
        CASE
            WHEN success THEN 1
            ELSE NULL::integer
        END) AS successful_count,
    count(
        CASE
            WHEN (NOT success) THEN 1
            ELSE NULL::integer
        END) AS failed_count,
    count(DISTINCT user_id) AS unique_users
   FROM public.encryption_audit_log
  GROUP BY (date(created_at)), organization_id, data_type, operation;


--
-- Name: auth_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_credentials (
    id integer NOT NULL,
    user_type character varying(20) NOT NULL,
    reference_id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    google_id character varying(255),
    is_google_user boolean DEFAULT false,
    CONSTRAINT auth_credentials_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['user'::character varying, 'partner'::character varying, 'organization'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: COLUMN auth_credentials.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auth_credentials.password_hash IS 'Password hash (nullable for Google OAuth users)';


--
-- Name: COLUMN auth_credentials.google_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auth_credentials.google_id IS 'Google user ID for OAuth authentication';


--
-- Name: COLUMN auth_credentials.is_google_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auth_credentials.is_google_user IS 'Flag indicating if user authenticated via Google OAuth';


--
-- Name: auth_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_credentials_id_seq OWNED BY public.auth_credentials.id;


--
-- Name: availability_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_slots (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    slot_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    start_datetime timestamp without time zone NOT NULL,
    end_datetime timestamp without time zone NOT NULL,
    status character varying(50) NOT NULL,
    location_type character varying(20) NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    booked_by_user_id integer,
    booked_at timestamp without time zone,
    appointment_id integer,
    is_published boolean DEFAULT false,
    last_published_at timestamp without time zone,
    has_google_conflict boolean DEFAULT false,
    google_conflict_details text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    archived_at timestamp without time zone,
    start_datetime_tz timestamp with time zone,
    end_datetime_tz timestamp with time zone,
    booked_at_tz timestamp with time zone,
    last_published_at_tz timestamp with time zone,
    created_at_tz timestamp with time zone,
    updated_at_tz timestamp with time zone,
    archived_at_tz timestamp with time zone,
    CONSTRAINT availability_slots_location_type_check CHECK (((location_type)::text = ANY ((ARRAY['online'::character varying, 'offline'::character varying])::text[]))),
    CONSTRAINT availability_slots_status_check CHECK (((status)::text = ANY ((ARRAY['available_online'::character varying, 'available_offline'::character varying, 'not_available_online'::character varying, 'not_available_offline'::character varying, 'booked'::character varying])::text[])))
);


--
-- Name: TABLE availability_slots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.availability_slots IS 'Stores therapist availability schedules for the next 7 days';


--
-- Name: COLUMN availability_slots.slot_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.slot_date IS 'The date of the availability slot';


--
-- Name: COLUMN availability_slots.start_datetime; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.start_datetime IS 'Combined datetime for efficient conflict checking';


--
-- Name: COLUMN availability_slots.is_available; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.is_available IS 'Derived from status: true for available_*, false for not_available_*';


--
-- Name: COLUMN availability_slots.is_published; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.is_published IS 'Whether slot is visible to clients';


--
-- Name: COLUMN availability_slots.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.archived_at IS 'Timestamp for soft deletion (older than 7 days)';


--
-- Name: COLUMN availability_slots.start_datetime_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.start_datetime_tz IS 'Slot start datetime (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN availability_slots.end_datetime_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.end_datetime_tz IS 'Slot end datetime (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN availability_slots.booked_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.booked_at_tz IS 'Booking timestamp (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN availability_slots.last_published_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.last_published_at_tz IS 'Last publication timestamp (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN availability_slots.created_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.created_at_tz IS 'Record creation time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN availability_slots.updated_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.updated_at_tz IS 'Record last update time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN availability_slots.archived_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.archived_at_tz IS 'Archive timestamp (TIMESTAMPTZ) - Migration column';


--
-- Name: availability_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.availability_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: availability_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.availability_slots_id_seq OWNED BY public.availability_slots.id;


--
-- Name: blogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blogs (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    excerpt text,
    content text NOT NULL,
    category character varying(100),
    author_id integer NOT NULL,
    author_type character varying(20) DEFAULT 'partner'::character varying NOT NULL,
    featured_image_url text,
    published boolean DEFAULT false,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE blogs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blogs IS 'Blog posts and news articles created by therapists with blog posting permission';


--
-- Name: blogs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blogs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blogs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blogs_id_seq OWNED BY public.blogs.id;


--
-- Name: case_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_histories (
    id integer NOT NULL,
    user_id integer NOT NULL,
    partner_id integer NOT NULL,
    identification_name text,
    identification_age integer,
    identification_gender text,
    identification_father_husband_name text,
    identification_education text,
    identification_occupation text,
    identification_marital_status text,
    identification_religion text,
    identification_nationality text,
    identification_mother_tongue text,
    identification_residence text,
    identification_family_income text,
    identification_socio_economic_background text,
    identification_family_type text,
    identification_domicile text,
    identification_address text,
    identification_source_of_referral text,
    identification_reason_for_referral text,
    informant_name text,
    informant_age integer,
    informant_sex text,
    informant_education text,
    informant_occupation text,
    informant_marital_status text,
    informant_religion text,
    informant_nationality text,
    informant_mother_tongue text,
    informant_relation_duration text,
    informant_consistency text,
    informant_reliability text,
    patient_report_reliability text,
    chief_complaints jsonb DEFAULT '[]'::jsonb,
    family_history_family_tree text,
    family_history_psychiatric_illness text,
    family_history_interaction_communication text,
    family_history_interaction_leadership text,
    family_history_interaction_decision_making text,
    family_history_interaction_role text,
    family_history_interaction_family_rituals text,
    family_history_interaction_cohesiveness text,
    family_history_interaction_family_burden text,
    family_history_expressed_emotion_warmth text,
    family_history_expressed_emotion_hostility text,
    family_history_expressed_emotion_critical_comments text,
    family_history_expressed_emotion_emotional_over_involvement text,
    family_history_expressed_emotion_reinforcement text,
    family_history_economic_social_status text,
    family_history_home_atmosphere text,
    family_history_sibling_rivalry text,
    personal_history_birth_date date,
    personal_history_birth_place text,
    personal_history_mother_condition_pregnancy text,
    personal_history_mother_condition_delivery text,
    personal_history_mother_condition_after_delivery text,
    personal_history_nature_of_delivery text,
    personal_history_birth_weight text,
    personal_history_feeding_method text,
    personal_history_milestones_physical_development text,
    personal_history_neurotic_symptoms_childhood text,
    personal_history_health_childhood text,
    personal_history_childhood_disorders text,
    personal_history_home_atmosphere_childhood text,
    scholastic_age_standard_admission text,
    scholastic_highest_grade_completed text,
    scholastic_change_institution_cause text,
    scholastic_academic_performance text,
    scholastic_reason_discontinuation text,
    scholastic_adjustment_school text,
    scholastic_peer_relationships text,
    scholastic_disciplinary_problems text,
    scholastic_further_education text,
    scholastic_extracurricular_activities text,
    vocation_age_starting text,
    vocation_nature_position text,
    vocation_change_job_cause text,
    vocation_nature_duration_present_job text,
    vocation_working_past_year text,
    vocation_work_record text,
    vocation_adjustment_peers_authority text,
    vocation_work_position_ambition text,
    menstrual_menarche_age text,
    menstrual_information_acquired_from text,
    menstrual_reaction text,
    menstrual_associated_discomfort text,
    menstrual_regularity text,
    menstrual_last_date date,
    menstrual_amenorrhea text,
    menstrual_menopause text,
    menstrual_related_symptoms text,
    sexual_source_information text,
    sexual_age_acquisition text,
    sexual_reaction_attitude text,
    sexual_libido text,
    sexual_masturbation text,
    sexual_fantasy text,
    sexual_heterosexual_homosexual text,
    sexual_pre_marital_extra_marital text,
    sexual_deviance text,
    marital_date_of_marriage date,
    marital_type text,
    marital_age_at_marriage integer,
    marital_partner_age_at_marriage integer,
    marital_spouse_education text,
    marital_spouse_occupation text,
    marital_adjustment text,
    marital_sexual_life text,
    marital_number_children_details text,
    marital_extra_marital_relations text,
    marital_other_details text,
    forensic_history text,
    medical_history_nature_illness text,
    medical_history_doctors_consulted text,
    medical_history_medication text,
    medical_history_hospitalization text,
    medical_history_degree_recovery text,
    medical_history_accidents_operations text,
    premorbid_personality_self text,
    premorbid_personality_sociability text,
    premorbid_personality_responsibility text,
    premorbid_personality_work_leisure text,
    premorbid_personality_mood text,
    premorbid_personality_character text,
    premorbid_personality_attitudes_standards text,
    premorbid_personality_habits text,
    premorbid_personality_adjustments text,
    premorbid_personality_food_sleep_pattern text,
    fantasy_life text,
    present_illness_evolution_symptoms text,
    present_illness_mode_onset text,
    present_illness_course text,
    present_illness_progress text,
    present_illness_sleep_change text,
    present_illness_appetite_change text,
    present_illness_sexual_interest_change text,
    present_illness_energy_change text,
    present_illness_negative_history text,
    present_illness_treatment_history text,
    problem_conception text,
    patient_view_responsibility text,
    patient_pervasive_mood text,
    impact_patient_attitude text,
    role_functioning_biological text,
    personal_care_negative_symptoms text,
    additional_information text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    family_history_consanguinity text,
    encrypted_data jsonb,
    encryption_key_id character varying(100),
    encryption_version integer DEFAULT 1,
    blind_indexes jsonb
);


--
-- Name: case_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_histories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_histories_id_seq OWNED BY public.case_histories.id;


--
-- Name: case_history_family_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_history_family_members (
    id integer NOT NULL,
    case_history_id integer NOT NULL,
    member_type character varying(20) NOT NULL,
    name text,
    age integer,
    education text,
    occupation text,
    religion text,
    nationality text,
    mother_tongue text,
    health text,
    personality text,
    relationship_attitude text,
    sibling_number integer,
    other_label text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sex character varying(20),
    CONSTRAINT case_history_family_members_member_type_check CHECK (((member_type)::text = ANY ((ARRAY['father'::character varying, 'mother'::character varying, 'sibling'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: COLUMN case_history_family_members.sex; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.case_history_family_members.sex IS 'Sex/Gender of the family member (Male/Female/Others)';


--
-- Name: case_history_family_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_history_family_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_history_family_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_history_family_members_id_seq OWNED BY public.case_history_family_members.id;


--
-- Name: contact_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_submissions (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE contact_submissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contact_submissions IS 'Stores contact form submissions from the website home page';


--
-- Name: contact_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contact_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contact_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contact_submissions_id_seq OWNED BY public.contact_submissions.id;


--
-- Name: data_retention_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_retention_policies (
    id integer NOT NULL,
    organization_id integer,
    data_type character varying(50) NOT NULL,
    retention_period_days integer NOT NULL,
    deletion_enabled boolean DEFAULT false,
    notification_days integer DEFAULT 30,
    last_cleanup_run timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE data_retention_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_retention_policies IS 'Data retention policies for HIPAA/GDPR compliance';


--
-- Name: data_retention_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_retention_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_retention_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_retention_policies_id_seq OWNED BY public.data_retention_policies.id;


--
-- Name: earnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.earnings (
    id integer NOT NULL,
    recipient_id integer NOT NULL,
    recipient_type character varying(20) NOT NULL,
    razorpay_payment_id character varying(255),
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying,
    status character varying(50) NOT NULL,
    session_id integer,
    appointment_id integer,
    payout_date date,
    payout_id integer,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT earnings_recipient_type_check CHECK (((recipient_type)::text = ANY ((ARRAY['partner'::character varying, 'organization'::character varying])::text[]))),
    CONSTRAINT earnings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'available'::character varying, 'held'::character varying, 'withdrawn'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.earnings IS 'Tracks earnings from payments for partners and organizations';


--
-- Name: COLUMN earnings.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.earnings.status IS 'pending: not yet available, available: ready for withdrawal, held: held for some reason, withdrawn: already paid out, cancelled: cancelled';


--
-- Name: earnings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.earnings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: earnings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.earnings_id_seq OWNED BY public.earnings.id;


--
-- Name: encryption_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.encryption_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: encryption_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.encryption_audit_log_id_seq OWNED BY public.encryption_audit_log.id;


--
-- Name: encryption_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encryption_keys (
    id integer NOT NULL,
    key_id character varying(100) NOT NULL,
    key_type character varying(50) NOT NULL,
    encrypted_key text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    organization_id integer,
    data_type character varying(50),
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rotated_at timestamp without time zone,
    retired_at timestamp without time zone,
    CONSTRAINT data_type_required_for_data_keys CHECK ((((key_type)::text <> 'data'::text) OR (data_type IS NOT NULL))),
    CONSTRAINT encryption_keys_key_type_check CHECK (((key_type)::text = ANY ((ARRAY['master'::character varying, 'organization'::character varying, 'data'::character varying])::text[]))),
    CONSTRAINT encryption_keys_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'deprecated'::character varying, 'retired'::character varying])::text[]))),
    CONSTRAINT organization_required_for_non_master_keys CHECK ((((key_type)::text = 'master'::text) OR (organization_id IS NOT NULL)))
);


--
-- Name: TABLE encryption_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.encryption_keys IS 'Stores encryption keys for HIPAA/GDPR compliant data protection';


--
-- Name: encryption_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.encryption_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: encryption_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.encryption_keys_id_seq OWNED BY public.encryption_keys.id;


--
-- Name: generated_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_reports (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    user_id integer NOT NULL,
    template_id integer,
    report_name character varying(255) NOT NULL,
    client_name character varying(255) NOT NULL,
    client_age integer,
    client_sex character varying(20),
    report_date date NOT NULL,
    description text NOT NULL,
    is_shared boolean DEFAULT false,
    shared_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    viewed_at timestamp without time zone,
    background_filename character varying(255)
);


--
-- Name: COLUMN generated_reports.viewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_reports.viewed_at IS 'Timestamp when the client first viewed the report';


--
-- Name: COLUMN generated_reports.background_filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_reports.background_filename IS 'Background image filename used when this report was generated. Preserves original background even if partner changes default.';


--
-- Name: generated_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.generated_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: generated_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.generated_reports_id_seq OWNED BY public.generated_reports.id;


--
-- Name: google_calendar_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_tokens (
    id integer NOT NULL,
    user_type character varying(20) NOT NULL,
    user_id integer NOT NULL,
    encrypted_access_token text NOT NULL,
    encrypted_refresh_token text NOT NULL,
    token_expires_at timestamp without time zone NOT NULL,
    calendar_id character varying(255) DEFAULT 'primary'::character varying,
    sync_enabled boolean DEFAULT true,
    connected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_synced_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT google_calendar_tokens_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['user'::character varying, 'partner'::character varying])::text[])))
);


--
-- Name: TABLE google_calendar_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.google_calendar_tokens IS 'Stores encrypted Google Calendar OAuth tokens for users and partners';


--
-- Name: COLUMN google_calendar_tokens.user_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.google_calendar_tokens.user_type IS 'Type of user: user (client) or partner (therapist)';


--
-- Name: COLUMN google_calendar_tokens.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.google_calendar_tokens.user_id IS 'Foreign key to users or partners table based on user_type';


--
-- Name: COLUMN google_calendar_tokens.encrypted_access_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.google_calendar_tokens.encrypted_access_token IS 'AES-256-GCM encrypted access token';


--
-- Name: COLUMN google_calendar_tokens.encrypted_refresh_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.google_calendar_tokens.encrypted_refresh_token IS 'AES-256-GCM encrypted refresh token';


--
-- Name: COLUMN google_calendar_tokens.token_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.google_calendar_tokens.token_expires_at IS 'Expiration timestamp for access token';


--
-- Name: COLUMN google_calendar_tokens.calendar_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.google_calendar_tokens.calendar_id IS 'Google Calendar ID (default: primary)';


--
-- Name: COLUMN google_calendar_tokens.sync_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.google_calendar_tokens.sync_enabled IS 'Whether sync is currently enabled';


--
-- Name: google_calendar_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.google_calendar_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: google_calendar_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.google_calendar_tokens_id_seq OWNED BY public.google_calendar_tokens.id;


--
-- Name: mental_status_examinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mental_status_examinations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    partner_id integer NOT NULL,
    general_appearance_appearance text,
    general_appearance_age text,
    general_appearance_touch_with_surroundings text,
    general_appearance_eye_contact text,
    general_appearance_hair text,
    general_appearance_rapport text,
    general_appearance_comments text,
    attitude text,
    attitude_manner_of_relating text,
    attitude_rapport text,
    motor_behavior text,
    speech_intensity_tone text,
    speech_reaction_time text,
    speech_speed text,
    speech_prosody_tempo text,
    speech_ease_of_speech text,
    speech_productivity_volume text,
    speech_relevant_irrelevant text,
    speech_coherent_incoherent text,
    speech_goal_direction text,
    volition_made_phenomenon text,
    volition_somatic_passivity text,
    volition_echolalia_echopraxia text,
    cognitive_attention_concentration text,
    cognitive_attention text,
    cognitive_orientation_time text,
    cognitive_orientation_space text,
    cognitive_orientation_person text,
    cognitive_orientation_situation text,
    cognitive_orientation_sense_of_passage_of_time text,
    cognitive_memory_immediate_digit_forward text,
    cognitive_memory_immediate_digit_backward text,
    cognitive_memory_immediate_word_recall text,
    cognitive_memory_immediate text,
    cognitive_memory_recent text,
    cognitive_memory_remote text,
    cognitive_abstract_ability text,
    intelligence_general_information text,
    intelligence_calculation text,
    intelligence_global_impression text,
    intelligence_comprehension text,
    intelligence_vocabulary text,
    mood_affect_subjective text,
    mood_affect_diurnal_variation text,
    mood_affect_objective text,
    mood_affect_depth text,
    mood_affect_range text,
    mood_affect_stability text,
    mood_affect_congruence_to_thought text,
    mood_affect_appropriate_to_situation text,
    mood_affect_communicability text,
    mood_affect_reactivity_to_stimulus text,
    thought_stream text,
    thought_stream_normal text,
    thought_stream_retarded text,
    thought_stream_retarded_thought_blocking text,
    thought_stream_retarded_circumstantiality text,
    thought_stream_accelerated text,
    thought_stream_accelerated_flight_of_ideas text,
    thought_stream_accelerated_prolixity text,
    thought_stream_accelerated_pressure_of_speech text,
    thought_form text,
    thought_form_sample_talk text,
    thought_possession_obsessions_compulsions text,
    thought_possession_thought_alienation text,
    thought_possession_thought_alienation_insertion text,
    thought_possession_thought_alienation_broadcasting text,
    thought_possession_thought_alienation_withdrawal text,
    thought_possession_sample_talk text,
    thought_content_religious_preoccupation text,
    thought_content_phobias text,
    thought_content_ideas text,
    thought_content_ideas_hopelessness text,
    thought_content_ideas_helplessness text,
    thought_content_ideas_worthlessness text,
    thought_content_ideas_guilt text,
    thought_content_ideas_death_wishes text,
    thought_content_ideas_suicide text,
    thought_content_ideas_homicide text,
    thought_content_ideas_hypochondriacal text,
    thought_content_delusions_primary text,
    thought_content_delusions_secondary text,
    thought_content_delusions_systematised text,
    thought_content_delusions_mood_congruent text,
    thought_content_delusions_types text,
    thought_content_delusions_sample_talk text,
    perceptual_sensory_distortion text,
    perceptual_sensory_deception text,
    perceptual_projection text,
    perceptual_modality text,
    perceptual_content text,
    perceptual_response_to_content text,
    perceptual_frequency_diurnal_pattern text,
    perceptual_thought_echo text,
    perceptual_description text,
    perceptual_others text,
    other_psychotic_phenomena text,
    other_psychopathological_phenomena text,
    judgement_test text,
    judgement_social text,
    judgement_personal text,
    insight text,
    insight_details text,
    verbatim_report text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    behavior_observation text,
    encrypted_data jsonb,
    encryption_key_id character varying(100),
    encryption_version integer DEFAULT 1,
    blind_indexes jsonb
);


--
-- Name: COLUMN mental_status_examinations.behavior_observation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mental_status_examinations.behavior_observation IS 'Detailed observation of patient behavior during examination';


--
-- Name: mental_status_examinations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mental_status_examinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mental_status_examinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mental_status_examinations_id_seq OWNED BY public.mental_status_examinations.id;


--
-- Name: migration_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_metadata (
    migration_name character varying(100) NOT NULL,
    version integer NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'completed'::character varying
);


--
-- Name: organization_signup_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_signup_tokens (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    token character varying(64) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone
);


--
-- Name: organization_signup_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organization_signup_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organization_signup_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organization_signup_tokens_id_seq OWNED BY public.organization_signup_tokens.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    date_of_creation date DEFAULT CURRENT_DATE NOT NULL,
    email character varying(255) NOT NULL,
    contact character varying(50) NOT NULL,
    address text,
    photo_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    gst_no character varying(50),
    subscription_plan character varying(50),
    is_active boolean DEFAULT true,
    deactivated_at timestamp without time zone,
    deactivated_by integer,
    video_sessions_enabled boolean DEFAULT true,
    theraptrack_controlled boolean DEFAULT false,
    number_of_therapists integer,
    subscription_plan_id integer,
    subscription_billing_period character varying(20),
    subscription_start_date date,
    subscription_end_date date,
    razorpay_subscription_id character varying(255),
    razorpay_customer_id character varying(255),
    payment_status character varying(50),
    is_cancelled boolean DEFAULT false,
    cancellation_date timestamp without time zone,
    razorpay_contact_id character varying(255),
    bank_account_holder_name text,
    bank_account_number text,
    bank_ifsc_code text,
    bank_name text,
    bank_account_verified boolean DEFAULT false,
    bank_account_verified_at timestamp without time zone,
    query_resolver boolean DEFAULT false,
    CONSTRAINT organizations_number_of_therapists_check CHECK (((number_of_therapists IS NULL) OR (number_of_therapists > 0))),
    CONSTRAINT organizations_payment_status_check CHECK (((payment_status IS NULL) OR ((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))),
    CONSTRAINT organizations_subscription_billing_period_check CHECK (((subscription_billing_period IS NULL) OR ((subscription_billing_period)::text = ANY ((ARRAY['yearly'::character varying, 'quarterly'::character varying, 'monthly'::character varying])::text[])))),
    CONSTRAINT organizations_subscription_plan_check CHECK (((subscription_plan)::text = ANY ((ARRAY['basic'::character varying, 'basic_silver'::character varying, 'basic_gold'::character varying, 'pro_silver'::character varying, 'pro_gold'::character varying, 'pro_platinum'::character varying])::text[])))
);


--
-- Name: COLUMN organizations.gst_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.gst_no IS 'GST registration number for the organization';


--
-- Name: COLUMN organizations.subscription_plan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.subscription_plan IS 'Subscription tier: basic, basic_silver, basic_gold, pro_silver, pro_gold, or pro_platinum. NULL means no plan.';


--
-- Name: COLUMN organizations.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.is_active IS 'Whether the organization account is active';


--
-- Name: COLUMN organizations.deactivated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.deactivated_at IS 'Timestamp when organization was deactivated';


--
-- Name: COLUMN organizations.deactivated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.deactivated_by IS 'Admin ID who deactivated the organization';


--
-- Name: COLUMN organizations.video_sessions_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.video_sessions_enabled IS 'Whether video session functionality is enabled for this organization';


--
-- Name: COLUMN organizations.theraptrack_controlled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.theraptrack_controlled IS 'Whether this organization is TheraPTrack controlled (therapists can see subscription details)';


--
-- Name: COLUMN organizations.number_of_therapists; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.number_of_therapists IS 'Number of therapists for billing calculation';


--
-- Name: COLUMN organizations.subscription_plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.subscription_plan_id IS 'Current active subscription plan';


--
-- Name: COLUMN organizations.subscription_billing_period; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.subscription_billing_period IS 'Billing period: yearly, quarterly, or monthly';


--
-- Name: COLUMN organizations.subscription_start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.subscription_start_date IS 'Start date of the current subscription';


--
-- Name: COLUMN organizations.subscription_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.subscription_end_date IS 'End date of the current subscription';


--
-- Name: COLUMN organizations.is_cancelled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.is_cancelled IS 'Indicates if organization subscription is cancelled. Access retained until subscription_end_date';


--
-- Name: COLUMN organizations.cancellation_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.cancellation_date IS 'Timestamp when organization subscription was cancelled';


--
-- Name: COLUMN organizations.razorpay_contact_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.razorpay_contact_id IS 'Razorpay contact ID for payout processing';


--
-- Name: COLUMN organizations.bank_account_holder_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.bank_account_holder_name IS 'Bank account holder name (encrypted, stored as TEXT)';


--
-- Name: COLUMN organizations.bank_account_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.bank_account_number IS 'Bank account number (encrypted, stored as TEXT to accommodate encrypted format)';


--
-- Name: COLUMN organizations.bank_ifsc_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.bank_ifsc_code IS 'IFSC code (encrypted, stored as TEXT)';


--
-- Name: COLUMN organizations.bank_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.bank_name IS 'Bank name (encrypted, stored as TEXT)';


--
-- Name: COLUMN organizations.bank_account_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.bank_account_verified IS 'Whether bank account details have been verified by admin';


--
-- Name: COLUMN organizations.bank_account_verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.bank_account_verified_at IS 'Timestamp when bank account was verified';


--
-- Name: COLUMN organizations.query_resolver; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.query_resolver IS 'Whether this organization can resolve support queries (technical support team member)';


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: partner_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_subscriptions (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    subscription_plan_id integer NOT NULL,
    billing_period character varying(20) NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    razorpay_subscription_id character varying(255),
    razorpay_payment_id character varying(255),
    payment_status character varying(50),
    subscription_start_date date,
    subscription_end_date date,
    is_cancelled boolean DEFAULT false,
    cancellation_date timestamp without time zone,
    CONSTRAINT partner_subscriptions_billing_period_check CHECK (((billing_period)::text = ANY ((ARRAY['monthly'::character varying, 'quarterly'::character varying, 'yearly'::character varying])::text[]))),
    CONSTRAINT partner_subscriptions_payment_status_check CHECK (((payment_status IS NULL) OR ((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))))
);


--
-- Name: TABLE partner_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.partner_subscriptions IS 'Stores subscription plan assignments for therapists in TheraPTrack controlled organizations';


--
-- Name: COLUMN partner_subscriptions.is_cancelled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partner_subscriptions.is_cancelled IS 'Indicates if subscription is cancelled. User retains access until subscription_end_date';


--
-- Name: COLUMN partner_subscriptions.cancellation_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partner_subscriptions.cancellation_date IS 'Timestamp when subscription was cancelled by user';


--
-- Name: partner_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partner_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_subscriptions_id_seq OWNED BY public.partner_subscriptions.id;


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id integer NOT NULL,
    partner_id character varying(7) NOT NULL,
    name character varying(255) NOT NULL,
    sex character varying(20) NOT NULL,
    age integer,
    email character varying(255),
    contact character varying(50) NOT NULL,
    address text,
    photo_url text,
    organization_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    verification_token character varying(255),
    verification_token_expires timestamp without time zone,
    deactivated_at timestamp without time zone,
    deactivated_by integer,
    default_report_template_id integer,
    qualification character varying(255) NOT NULL,
    license_id character varying(100),
    default_report_background character varying(255),
    work_experience text,
    other_practice_details text,
    fee_min numeric(10,2),
    fee_max numeric(10,2),
    fee_currency character varying(3) DEFAULT 'INR'::character varying,
    language_preferences text,
    video_sessions_enabled boolean DEFAULT true,
    session_fee numeric(10,2),
    booking_fee numeric(10,2),
    razorpay_contact_id character varying(255),
    can_post_blogs boolean DEFAULT false,
    bank_account_holder_name text,
    bank_account_number text,
    bank_ifsc_code text,
    bank_name text,
    bank_account_verified boolean DEFAULT false,
    bank_account_verified_at timestamp without time zone,
    query_resolver boolean DEFAULT false,
    CONSTRAINT chk_fee_range CHECK ((((fee_min IS NULL) AND (fee_max IS NULL)) OR ((fee_min IS NOT NULL) AND (fee_max IS NOT NULL) AND (fee_max >= fee_min)) OR ((fee_min IS NULL) AND (fee_max IS NOT NULL)) OR ((fee_min IS NOT NULL) AND (fee_max IS NULL)))),
    CONSTRAINT partners_age_check CHECK (((age IS NULL) OR ((age > 0) AND (age <= 150)))),
    CONSTRAINT partners_sex_check CHECK (((sex)::text = ANY ((ARRAY['Male'::character varying, 'Female'::character varying, 'Others'::character varying])::text[])))
);


--
-- Name: COLUMN partners.age; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.age IS 'Age of the therapist (optional)';


--
-- Name: COLUMN partners.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.is_active IS 'Whether the partner account is active (can login)';


--
-- Name: COLUMN partners.email_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.email_verified IS 'Whether the partner has verified their email address';


--
-- Name: COLUMN partners.verification_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.verification_token IS 'Token for email verification (expires in 1 hour)';


--
-- Name: COLUMN partners.verification_token_expires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.verification_token_expires IS 'Expiration timestamp for verification token';


--
-- Name: COLUMN partners.deactivated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.deactivated_at IS 'Timestamp when partner was deactivated';


--
-- Name: COLUMN partners.deactivated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.deactivated_by IS 'Organization ID that deactivated this partner';


--
-- Name: COLUMN partners.default_report_template_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.default_report_template_id IS 'Default report template selected by the partner';


--
-- Name: COLUMN partners.qualification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.qualification IS 'Professional qualification of the partner (e.g., M.A. Clinical Psychology)';


--
-- Name: COLUMN partners.license_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.license_id IS 'Professional license ID or registration number';


--
-- Name: COLUMN partners.default_report_background; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.default_report_background IS 'Filename of the selected report background image from assets folder';


--
-- Name: COLUMN partners.work_experience; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.work_experience IS 'Work experience details of the therapist (optional)';


--
-- Name: COLUMN partners.other_practice_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.other_practice_details IS 'Other significant work related details (optional)';


--
-- Name: COLUMN partners.fee_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.fee_min IS 'Minimum fee charged by the therapist (optional)';


--
-- Name: COLUMN partners.fee_max; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.fee_max IS 'Maximum fee charged by the therapist (optional)';


--
-- Name: COLUMN partners.fee_currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.fee_currency IS 'Currency code for fees (ISO 4217 format, e.g., USD, EUR, INR). Default: INR';


--
-- Name: COLUMN partners.language_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.language_preferences IS 'Comma-separated list of languages spoken by the therapist (e.g., "English, Hindi, Tamil"). Displayed to clients in the therapist profile.';


--
-- Name: COLUMN partners.video_sessions_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.video_sessions_enabled IS 'Controls whether individual therapist can use video sessions. Only applicable for theraptrack_controlled organizations.';


--
-- Name: COLUMN partners.session_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.session_fee IS 'Fee charged per session by the therapist (optional)';


--
-- Name: COLUMN partners.booking_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.booking_fee IS 'Booking fee collected as part of appointment booking (optional)';


--
-- Name: COLUMN partners.razorpay_contact_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.razorpay_contact_id IS 'Razorpay contact ID for payout processing';


--
-- Name: COLUMN partners.can_post_blogs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.can_post_blogs IS 'Permission flag to allow therapist to post blogs';


--
-- Name: COLUMN partners.bank_account_holder_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.bank_account_holder_name IS 'Bank account holder name (encrypted, stored as TEXT)';


--
-- Name: COLUMN partners.bank_account_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.bank_account_number IS 'Bank account number (encrypted, stored as TEXT to accommodate encrypted format)';


--
-- Name: COLUMN partners.bank_ifsc_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.bank_ifsc_code IS 'IFSC code (encrypted, stored as TEXT)';


--
-- Name: COLUMN partners.bank_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.bank_name IS 'Bank name (encrypted, stored as TEXT)';


--
-- Name: COLUMN partners.bank_account_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.bank_account_verified IS 'Whether bank account details have been verified by admin';


--
-- Name: COLUMN partners.bank_account_verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.bank_account_verified_at IS 'Timestamp when bank account was verified';


--
-- Name: COLUMN partners.query_resolver; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partners.query_resolver IS 'Whether this partner can resolve support queries (technical support team member)';


--
-- Name: CONSTRAINT chk_fee_range ON partners; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_fee_range ON public.partners IS 'Ensures fee_max is greater than or equal to fee_min when both are provided';


--
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE password_reset_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.password_reset_tokens IS 'Stores temporary tokens for password reset requests with 1-hour expiry';


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payouts (
    id integer NOT NULL,
    recipient_id integer NOT NULL,
    recipient_type character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying,
    status character varying(50) NOT NULL,
    payout_date date NOT NULL,
    payment_method character varying(50),
    transaction_id character varying(255),
    notes text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    transaction_fee numeric(10,2) DEFAULT 0,
    gst_on_fee numeric(10,2) DEFAULT 0,
    net_amount numeric(10,2),
    gross_amount numeric(10,2),
    CONSTRAINT payouts_recipient_type_check CHECK (((recipient_type)::text = ANY ((ARRAY['partner'::character varying, 'organization'::character varying])::text[]))),
    CONSTRAINT payouts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE payouts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payouts IS 'Tracks payouts/withdrawals for partners and organizations';


--
-- Name: COLUMN payouts.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payouts.status IS 'pending: scheduled, processing: being processed, completed: successfully paid, failed: payment failed, cancelled: cancelled';


--
-- Name: COLUMN payouts.transaction_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payouts.transaction_fee IS 'Razorpay transaction fee deducted (base fee before GST)';


--
-- Name: COLUMN payouts.gst_on_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payouts.gst_on_fee IS 'GST amount on transaction fee';


--
-- Name: COLUMN payouts.net_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payouts.net_amount IS 'Amount after fee deduction (gross_amount - transaction_fee - gst_on_fee)';


--
-- Name: COLUMN payouts.gross_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payouts.gross_amount IS 'Original amount before fee deduction';


--
-- Name: payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payouts_id_seq OWNED BY public.payouts.id;


--
-- Name: questionnaire_answer_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_answer_options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text character varying(255) NOT NULL,
    option_value integer NOT NULL,
    option_order integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE questionnaire_answer_options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.questionnaire_answer_options IS 'Stores answer options for each question';


--
-- Name: questionnaire_answer_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questionnaire_answer_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questionnaire_answer_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questionnaire_answer_options_id_seq OWNED BY public.questionnaire_answer_options.id;


--
-- Name: questionnaire_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_questions (
    id integer NOT NULL,
    questionnaire_id integer NOT NULL,
    question_text text NOT NULL,
    question_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sub_heading character varying(255)
);


--
-- Name: TABLE questionnaire_questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.questionnaire_questions IS 'Stores questions for each questionnaire';


--
-- Name: COLUMN questionnaire_questions.sub_heading; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaire_questions.sub_heading IS 'Optional sub-heading to group questions together';


--
-- Name: questionnaire_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questionnaire_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questionnaire_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questionnaire_questions_id_seq OWNED BY public.questionnaire_questions.id;


--
-- Name: questionnaire_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_shares (
    id integer NOT NULL,
    questionnaire_id integer NOT NULL,
    shared_by_type character varying(20) NOT NULL,
    shared_by_id integer NOT NULL,
    shared_with_type character varying(20) NOT NULL,
    shared_with_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT questionnaire_shares_shared_by_type_check CHECK (((shared_by_type)::text = ANY ((ARRAY['admin'::character varying, 'organization'::character varying])::text[]))),
    CONSTRAINT questionnaire_shares_shared_with_type_check CHECK (((shared_with_type)::text = ANY ((ARRAY['organization'::character varying, 'partner'::character varying])::text[])))
);


--
-- Name: TABLE questionnaire_shares; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.questionnaire_shares IS 'Tracks sharing of questionnaires from Admin to Organizations and Organizations to Partners';


--
-- Name: COLUMN questionnaire_shares.shared_by_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaire_shares.shared_by_type IS 'Type of entity sharing the questionnaire: admin or organization';


--
-- Name: COLUMN questionnaire_shares.shared_by_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaire_shares.shared_by_id IS 'ID of the admin or organization sharing the questionnaire';


--
-- Name: COLUMN questionnaire_shares.shared_with_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaire_shares.shared_with_type IS 'Type of entity receiving the shared questionnaire: organization or partner';


--
-- Name: COLUMN questionnaire_shares.shared_with_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaire_shares.shared_with_id IS 'ID of the organization or partner receiving the shared questionnaire';


--
-- Name: questionnaire_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questionnaire_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questionnaire_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questionnaire_shares_id_seq OWNED BY public.questionnaire_shares.id;


--
-- Name: questionnaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaires (
    id integer NOT NULL,
    partner_id integer,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    has_text_field boolean DEFAULT false,
    text_field_label character varying(500),
    text_field_placeholder text,
    color_coding_scheme character varying(10) DEFAULT NULL::character varying,
    created_by_type character varying(20),
    admin_id integer,
    organization_id integer,
    CONSTRAINT chk_questionnaire_owner CHECK (((((created_by_type)::text = 'admin'::text) AND (admin_id IS NOT NULL) AND (partner_id IS NULL) AND (organization_id IS NULL)) OR (((created_by_type)::text = 'organization'::text) AND (organization_id IS NOT NULL) AND (partner_id IS NULL) AND (admin_id IS NULL)) OR (((created_by_type)::text = 'partner'::text) AND (partner_id IS NOT NULL) AND (admin_id IS NULL) AND (organization_id IS NULL)))),
    CONSTRAINT questionnaires_color_coding_scheme_check CHECK (((color_coding_scheme)::text = ANY ((ARRAY['4-point'::character varying, '5-point'::character varying, NULL::character varying])::text[]))),
    CONSTRAINT questionnaires_created_by_type_check CHECK (((created_by_type)::text = ANY ((ARRAY['admin'::character varying, 'organization'::character varying, 'partner'::character varying])::text[])))
);


--
-- Name: TABLE questionnaires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.questionnaires IS 'Stores questionnaire templates created by partners';


--
-- Name: COLUMN questionnaires.color_coding_scheme; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaires.color_coding_scheme IS 'Optional color coding for answer options: NULL (no coloring), 4-point (4 colors), or 5-point (5 colors). Colors are applied position-based from green (best) to red (worst).';


--
-- Name: COLUMN questionnaires.created_by_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaires.created_by_type IS 'Type of entity that created the questionnaire: admin, organization, or partner';


--
-- Name: COLUMN questionnaires.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaires.admin_id IS 'ID of admin who created the questionnaire (if created_by_type is admin)';


--
-- Name: COLUMN questionnaires.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questionnaires.organization_id IS 'ID of organization who created the questionnaire (if created_by_type is organization)';


--
-- Name: questionnaires_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questionnaires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questionnaires_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questionnaires_id_seq OWNED BY public.questionnaires.id;


--
-- Name: razorpay_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.razorpay_orders (
    id integer NOT NULL,
    razorpay_order_id character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying,
    receipt character varying(255),
    status character varying(50) NOT NULL,
    customer_id integer,
    customer_type character varying(20),
    subscription_plan_id integer,
    billing_period character varying(20),
    notes jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT razorpay_orders_billing_period_check CHECK (((billing_period)::text = ANY ((ARRAY['monthly'::character varying, 'quarterly'::character varying, 'yearly'::character varying])::text[]))),
    CONSTRAINT razorpay_orders_customer_type_check CHECK (((customer_type IS NULL) OR ((customer_type)::text = ANY ((ARRAY['partner'::character varying, 'organization'::character varying, 'user'::character varying])::text[])))),
    CONSTRAINT razorpay_orders_status_check CHECK (((status)::text = ANY ((ARRAY['created'::character varying, 'attempted'::character varying, 'paid'::character varying, 'failed'::character varying, 'captured'::character varying])::text[])))
);


--
-- Name: TABLE razorpay_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.razorpay_orders IS 'Tracks Razorpay orders';


--
-- Name: razorpay_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.razorpay_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: razorpay_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.razorpay_orders_id_seq OWNED BY public.razorpay_orders.id;


--
-- Name: razorpay_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.razorpay_payments (
    id integer NOT NULL,
    razorpay_payment_id character varying(255) NOT NULL,
    razorpay_order_id character varying(255),
    razorpay_subscription_id character varying(255),
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying,
    status character varying(50) NOT NULL,
    payment_method character varying(50),
    description text,
    customer_id integer,
    customer_type character varying(20),
    subscription_plan_id integer,
    billing_period character varying(20),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT razorpay_payments_billing_period_check CHECK (((billing_period)::text = ANY ((ARRAY['monthly'::character varying, 'quarterly'::character varying, 'yearly'::character varying])::text[]))),
    CONSTRAINT razorpay_payments_customer_type_check CHECK (((customer_type IS NULL) OR ((customer_type)::text = ANY ((ARRAY['partner'::character varying, 'organization'::character varying, 'user'::character varying])::text[])))),
    CONSTRAINT razorpay_payments_status_check CHECK (((status)::text = ANY ((ARRAY['created'::character varying, 'authorized'::character varying, 'captured'::character varying, 'refunded'::character varying, 'failed'::character varying, 'pending'::character varying])::text[])))
);


--
-- Name: TABLE razorpay_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.razorpay_payments IS 'Tracks all Razorpay payment transactions';


--
-- Name: razorpay_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.razorpay_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: razorpay_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.razorpay_payments_id_seq OWNED BY public.razorpay_payments.id;


--
-- Name: razorpay_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.razorpay_subscriptions (
    id integer NOT NULL,
    razorpay_subscription_id character varying(255) NOT NULL,
    razorpay_plan_id character varying(255),
    customer_id integer NOT NULL,
    customer_type character varying(20) NOT NULL,
    subscription_plan_id integer NOT NULL,
    billing_period character varying(20) NOT NULL,
    status character varying(50) NOT NULL,
    current_start timestamp without time zone,
    current_end timestamp without time zone,
    ended_at timestamp without time zone,
    quantity integer DEFAULT 1,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT razorpay_subscriptions_billing_period_check CHECK (((billing_period)::text = ANY ((ARRAY['monthly'::character varying, 'quarterly'::character varying, 'yearly'::character varying])::text[]))),
    CONSTRAINT razorpay_subscriptions_customer_type_check CHECK (((customer_type)::text = ANY ((ARRAY['partner'::character varying, 'organization'::character varying])::text[]))),
    CONSTRAINT razorpay_subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['created'::character varying, 'authenticated'::character varying, 'active'::character varying, 'pending'::character varying, 'halted'::character varying, 'cancelled'::character varying, 'completed'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: TABLE razorpay_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.razorpay_subscriptions IS 'Tracks Razorpay recurring subscriptions';


--
-- Name: razorpay_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.razorpay_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: razorpay_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.razorpay_subscriptions_id_seq OWNED BY public.razorpay_subscriptions.id;


--
-- Name: razorpay_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.razorpay_webhooks (
    id integer NOT NULL,
    event_id character varying(255),
    event_type character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id character varying(255),
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE razorpay_webhooks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.razorpay_webhooks IS 'Tracks Razorpay webhook events for audit and debugging';


--
-- Name: razorpay_webhooks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.razorpay_webhooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: razorpay_webhooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.razorpay_webhooks_id_seq OWNED BY public.razorpay_webhooks.id;


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    file_path text NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size integer,
    uploaded_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: report_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_templates_id_seq OWNED BY public.report_templates.id;


--
-- Name: security_alerts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.security_alerts AS
 SELECT 'EXCESSIVE_FAILED_ACCESS'::text AS alert_type,
    encryption_audit_log.user_id,
    encryption_audit_log.organization_id,
    count(*) AS failed_attempts,
    min(encryption_audit_log.created_at) AS first_attempt,
    max(encryption_audit_log.created_at) AS last_attempt
   FROM public.encryption_audit_log
  WHERE ((encryption_audit_log.success = false) AND (encryption_audit_log.user_id IS NOT NULL))
  GROUP BY encryption_audit_log.user_id, encryption_audit_log.organization_id
 HAVING (count(*) > 5)
UNION ALL
 SELECT 'AFTER_HOURS_ACCESS'::text AS alert_type,
    encryption_audit_log.user_id,
    encryption_audit_log.organization_id,
    count(*) AS failed_attempts,
    min(encryption_audit_log.created_at) AS first_attempt,
    max(encryption_audit_log.created_at) AS last_attempt
   FROM public.encryption_audit_log
  WHERE ((EXTRACT(hour FROM encryption_audit_log.created_at) < (6)::numeric) OR (EXTRACT(hour FROM encryption_audit_log.created_at) > (22)::numeric))
  GROUP BY encryption_audit_log.user_id, encryption_audit_log.organization_id
 HAVING (count(*) > 10);


--
-- Name: session_questionnaire_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_questionnaire_assignments (
    id integer NOT NULL,
    therapy_session_id integer NOT NULL,
    user_questionnaire_assignment_id integer CONSTRAINT session_questionnaire_assig_user_questionnaire_assignm_not_null NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE session_questionnaire_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.session_questionnaire_assignments IS 'Links therapy sessions to questionnaire assignments';


--
-- Name: COLUMN session_questionnaire_assignments.therapy_session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session_questionnaire_assignments.therapy_session_id IS 'Reference to the therapy session';


--
-- Name: COLUMN session_questionnaire_assignments.user_questionnaire_assignment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session_questionnaire_assignments.user_questionnaire_assignment_id IS 'Reference to the questionnaire assignment sent to the client';


--
-- Name: session_questionnaire_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.session_questionnaire_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: session_questionnaire_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.session_questionnaire_assignments_id_seq OWNED BY public.session_questionnaire_assignments.id;


--
-- Name: shared_charts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_charts (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    user_id integer NOT NULL,
    chart_type character varying(50) NOT NULL,
    selected_sessions text,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    questionnaire_id integer,
    selected_assignments text,
    chart_display_type character varying(20) DEFAULT 'radar'::character varying,
    CONSTRAINT shared_charts_chart_display_type_check CHECK (((chart_display_type)::text = ANY ((ARRAY['radar'::character varying, 'line'::character varying, 'bar'::character varying])::text[]))),
    CONSTRAINT shared_charts_chart_type_check CHECK (((chart_type)::text = ANY ((ARRAY['radar_default'::character varying, 'comparison'::character varying, 'questionnaire_comparison'::character varying])::text[])))
);


--
-- Name: COLUMN shared_charts.questionnaire_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shared_charts.questionnaire_id IS 'Reference to the questionnaire type being compared';


--
-- Name: COLUMN shared_charts.selected_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shared_charts.selected_assignments IS 'JSON array of assignment IDs for questionnaire comparison';


--
-- Name: COLUMN shared_charts.chart_display_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shared_charts.chart_display_type IS 'Type of chart display: radar, line, or bar';


--
-- Name: shared_charts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shared_charts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shared_charts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shared_charts_id_seq OWNED BY public.shared_charts.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    plan_name character varying(255) NOT NULL,
    min_sessions integer NOT NULL,
    max_sessions integer,
    has_video boolean DEFAULT false,
    individual_yearly_price numeric(10,2) NOT NULL,
    individual_quarterly_price numeric(10,2) NOT NULL,
    individual_monthly_price numeric(10,2) NOT NULL,
    organization_yearly_price numeric(10,2) NOT NULL,
    organization_quarterly_price numeric(10,2) NOT NULL,
    organization_monthly_price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    individual_yearly_enabled boolean DEFAULT true,
    individual_quarterly_enabled boolean DEFAULT true,
    individual_monthly_enabled boolean DEFAULT true,
    organization_yearly_enabled boolean DEFAULT true,
    organization_quarterly_enabled boolean DEFAULT true,
    organization_monthly_enabled boolean DEFAULT true,
    plan_type character varying(20),
    min_therapists integer,
    max_therapists integer,
    plan_order integer DEFAULT 0,
    has_whatsapp boolean DEFAULT false,
    has_advanced_assessments boolean DEFAULT false,
    has_report_generation boolean DEFAULT false,
    has_custom_branding boolean DEFAULT false,
    has_advanced_analytics boolean DEFAULT false,
    has_priority_support boolean DEFAULT false,
    has_email_support boolean DEFAULT false,
    plan_duration_days integer,
    CONSTRAINT check_therapist_range CHECK (((((plan_type)::text = 'individual'::text) AND (min_therapists IS NULL) AND (max_therapists IS NULL)) OR (((plan_type)::text = 'organization'::text) AND (min_therapists IS NOT NULL) AND (max_therapists IS NOT NULL) AND (min_therapists <= max_therapists)) OR (((plan_type)::text = 'common'::text) AND (min_therapists IS NULL) AND (max_therapists IS NULL)))),
    CONSTRAINT subscription_plans_check CHECK ((max_sessions >= min_sessions)),
    CONSTRAINT subscription_plans_individual_monthly_price_check CHECK ((individual_monthly_price >= (0)::numeric)),
    CONSTRAINT subscription_plans_individual_quarterly_price_check CHECK ((individual_quarterly_price >= (0)::numeric)),
    CONSTRAINT subscription_plans_individual_yearly_price_check CHECK ((individual_yearly_price >= (0)::numeric)),
    CONSTRAINT subscription_plans_max_sessions_check CHECK (((max_sessions IS NULL) OR ((max_sessions >= min_sessions) AND (max_sessions >= 0)))),
    CONSTRAINT subscription_plans_min_sessions_check CHECK ((min_sessions >= 0)),
    CONSTRAINT subscription_plans_organization_monthly_price_check CHECK ((organization_monthly_price >= (0)::numeric)),
    CONSTRAINT subscription_plans_organization_quarterly_price_check CHECK ((organization_quarterly_price >= (0)::numeric)),
    CONSTRAINT subscription_plans_organization_yearly_price_check CHECK ((organization_yearly_price >= (0)::numeric)),
    CONSTRAINT subscription_plans_plan_type_check CHECK (((plan_type)::text = ANY ((ARRAY['individual'::character varying, 'organization'::character varying, 'common'::character varying])::text[])))
);


--
-- Name: TABLE subscription_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subscription_plans IS 'Subscription plans with enhanced feature flags, configurable duration, and support for common plan type';


--
-- Name: COLUMN subscription_plans.plan_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.plan_name IS 'Name of the subscription plan (e.g., Plan 1, Plan 2)';


--
-- Name: COLUMN subscription_plans.min_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.min_sessions IS 'Minimum number of sessions per month allowed';


--
-- Name: COLUMN subscription_plans.max_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.max_sessions IS 'Maximum number of sessions per month allowed';


--
-- Name: COLUMN subscription_plans.has_video; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.has_video IS 'Whether this plan includes video feature (boolean toggle only)';


--
-- Name: COLUMN subscription_plans.individual_yearly_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.individual_yearly_price IS 'Yearly price for individual therapists';


--
-- Name: COLUMN subscription_plans.individual_quarterly_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.individual_quarterly_price IS 'Quarterly price for individual therapists';


--
-- Name: COLUMN subscription_plans.individual_monthly_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.individual_monthly_price IS 'Monthly price for individual therapists';


--
-- Name: COLUMN subscription_plans.organization_yearly_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.organization_yearly_price IS 'Yearly price per therapist for organizations';


--
-- Name: COLUMN subscription_plans.organization_quarterly_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.organization_quarterly_price IS 'Quarterly price per therapist for organizations';


--
-- Name: COLUMN subscription_plans.organization_monthly_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.organization_monthly_price IS 'Monthly price per therapist for organizations';


--
-- Name: COLUMN subscription_plans.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.is_active IS 'Whether this plan is currently active and available';


--
-- Name: COLUMN subscription_plans.individual_yearly_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.individual_yearly_enabled IS 'Whether yearly billing is enabled for individual therapists';


--
-- Name: COLUMN subscription_plans.individual_quarterly_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.individual_quarterly_enabled IS 'Whether quarterly billing is enabled for individual therapists';


--
-- Name: COLUMN subscription_plans.individual_monthly_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.individual_monthly_enabled IS 'Whether monthly billing is enabled for individual therapists (should always be true)';


--
-- Name: COLUMN subscription_plans.organization_yearly_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.organization_yearly_enabled IS 'Whether yearly billing is enabled for organizations';


--
-- Name: COLUMN subscription_plans.organization_quarterly_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.organization_quarterly_enabled IS 'Whether quarterly billing is enabled for organizations';


--
-- Name: COLUMN subscription_plans.organization_monthly_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.organization_monthly_enabled IS 'Whether monthly billing is enabled for organizations (should always be true)';


--
-- Name: COLUMN subscription_plans.has_whatsapp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.has_whatsapp IS 'Whether this plan includes WhatsApp messaging capability';


--
-- Name: COLUMN subscription_plans.has_advanced_assessments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.has_advanced_assessments IS 'Whether this plan includes advanced assessments & questionnaires';


--
-- Name: COLUMN subscription_plans.has_report_generation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.has_report_generation IS 'Whether this plan includes report generation feature';


--
-- Name: COLUMN subscription_plans.has_custom_branding; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.has_custom_branding IS 'Whether this plan includes custom branding feature';


--
-- Name: COLUMN subscription_plans.has_advanced_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.has_advanced_analytics IS 'Whether this plan includes advanced analytics feature';


--
-- Name: COLUMN subscription_plans.has_priority_support; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.has_priority_support IS 'Whether this plan includes priority support access';


--
-- Name: COLUMN subscription_plans.has_email_support; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.has_email_support IS 'Whether this plan includes email support access';


--
-- Name: COLUMN subscription_plans.plan_duration_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.plan_duration_days IS 'Configurable duration in days for plans (e.g., 7 days for Free Plan). NULL means no duration limit.';


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: support_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_conversations (
    id integer NOT NULL,
    requester_type character varying(20) NOT NULL,
    requester_id integer NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying,
    priority integer DEFAULT 0,
    subscription_plan_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_message_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_conversations_requester_type_check CHECK (((requester_type)::text = ANY ((ARRAY['partner'::character varying, 'organization'::character varying])::text[]))),
    CONSTRAINT support_conversations_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: TABLE support_conversations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.support_conversations IS 'Stores support chat conversations between app users and technical support team';


--
-- Name: COLUMN support_conversations.requester_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_conversations.requester_type IS 'Type of user requesting support: partner or organization';


--
-- Name: COLUMN support_conversations.requester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_conversations.requester_id IS 'ID of the partner or organization requesting support';


--
-- Name: COLUMN support_conversations.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_conversations.priority IS 'Priority level based on subscription plan order (higher plan_order = higher priority)';


--
-- Name: COLUMN support_conversations.subscription_plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_conversations.subscription_plan_id IS 'Current subscription plan ID of the requester at time of conversation creation';


--
-- Name: support_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_conversations_id_seq OWNED BY public.support_conversations.id;


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    sender_type character varying(20) NOT NULL,
    sender_id integer NOT NULL,
    message text NOT NULL,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_messages_sender_type_check CHECK (((sender_type)::text = ANY ((ARRAY['partner'::character varying, 'organization'::character varying, 'admin'::character varying, 'user'::character varying])::text[])))
);


--
-- Name: TABLE support_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.support_messages IS 'Stores individual messages in support conversations';


--
-- Name: COLUMN support_messages.sender_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_messages.sender_type IS 'Type of sender: partner, organization, admin, or user';


--
-- Name: COLUMN support_messages.sender_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_messages.sender_id IS 'ID of the sender (partner, organization, or admin)';


--
-- Name: COLUMN support_messages.read_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_messages.read_at IS 'Timestamp when the message was read by the recipient';


--
-- Name: support_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_messages_id_seq OWNED BY public.support_messages.id;


--
-- Name: therapy_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.therapy_sessions (
    id integer NOT NULL,
    appointment_id integer,
    partner_id integer NOT NULL,
    user_id integer NOT NULL,
    session_title character varying(255) NOT NULL,
    session_notes text,
    payment_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    session_date timestamp without time zone NOT NULL,
    session_duration integer,
    video_session_id integer,
    session_number integer NOT NULL,
    session_date_tz timestamp with time zone,
    created_at_tz timestamp with time zone,
    updated_at_tz timestamp with time zone,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    CONSTRAINT therapy_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'started'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: TABLE therapy_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.therapy_sessions IS 'Therapy session records created from appointments';


--
-- Name: COLUMN therapy_sessions.appointment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.appointment_id IS 'Reference to the appointment this session was created from. Set to NULL when appointment is deleted, but session is preserved.';


--
-- Name: COLUMN therapy_sessions.partner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.partner_id IS 'Reference to the therapist/partner who conducted the session';


--
-- Name: COLUMN therapy_sessions.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.user_id IS 'Reference to the client/user who attended the session';


--
-- Name: COLUMN therapy_sessions.session_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.session_title IS 'Title/subject of the therapy session';


--
-- Name: COLUMN therapy_sessions.session_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.session_notes IS 'Therapist notes about the session content and observations';


--
-- Name: COLUMN therapy_sessions.payment_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.payment_notes IS 'Payment-related information and notes';


--
-- Name: COLUMN therapy_sessions.session_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.session_date IS 'Date and time when the therapy session occurred (independent of appointment)';


--
-- Name: COLUMN therapy_sessions.session_duration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.session_duration IS 'Duration of the session in minutes';


--
-- Name: COLUMN therapy_sessions.video_session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.video_session_id IS 'Reference to the video session this therapy session was created from (if applicable)';


--
-- Name: COLUMN therapy_sessions.session_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.session_number IS 'Sequential session number for this user-partner pair (1, 2, 3, etc.)';


--
-- Name: COLUMN therapy_sessions.session_date_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.session_date_tz IS 'Session datetime (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN therapy_sessions.created_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.created_at_tz IS 'Record creation time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN therapy_sessions.updated_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.updated_at_tz IS 'Record last update time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN therapy_sessions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.therapy_sessions.status IS 'Session status: scheduled (not yet started), started (in progress), completed (finished)';


--
-- Name: therapy_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.therapy_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: therapy_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.therapy_sessions_id_seq OWNED BY public.therapy_sessions.id;


--
-- Name: user_partner_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_partner_assignments (
    user_id integer NOT NULL,
    partner_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_questionnaire_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_questionnaire_assignments (
    id integer NOT NULL,
    questionnaire_id integer NOT NULL,
    user_id integer NOT NULL,
    partner_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying,
    completed_at timestamp without time zone,
    CONSTRAINT user_questionnaire_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: TABLE user_questionnaire_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_questionnaire_assignments IS 'Tracks which questionnaires are assigned to which users';


--
-- Name: user_questionnaire_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_questionnaire_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_questionnaire_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_questionnaire_assignments_id_seq OWNED BY public.user_questionnaire_assignments.id;


--
-- Name: user_questionnaire_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_questionnaire_responses (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    question_id integer NOT NULL,
    answer_option_id integer NOT NULL,
    response_value integer NOT NULL,
    session_id integer,
    responded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE user_questionnaire_responses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_questionnaire_responses IS 'Stores user responses to questionnaires';


--
-- Name: user_questionnaire_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_questionnaire_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_questionnaire_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_questionnaire_responses_id_seq OWNED BY public.user_questionnaire_responses.id;


--
-- Name: user_questionnaire_text_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_questionnaire_text_responses (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    text_response text,
    responded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE user_questionnaire_text_responses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_questionnaire_text_responses IS 'Stores user text responses for questionnaires with text fields';


--
-- Name: user_questionnaire_text_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_questionnaire_text_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_questionnaire_text_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_questionnaire_text_responses_id_seq OWNED BY public.user_questionnaire_text_responses.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    sex character varying(20) NOT NULL,
    age integer NOT NULL,
    email character varying(255),
    contact character varying(50) NOT NULL,
    address text,
    photo_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_age_check CHECK ((age > 0)),
    CONSTRAINT users_sex_check CHECK (((sex)::text = ANY ((ARRAY['Male'::character varying, 'Female'::character varying, 'Others'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: video_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_sessions (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    session_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    duration_minutes integer DEFAULT 60,
    meeting_room_id character varying(255) NOT NULL,
    password character varying(255),
    password_enabled boolean DEFAULT true,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    timezone character varying(100) DEFAULT 'UTC'::character varying,
    google_event_id character varying(255),
    google_sync_status character varying(20) DEFAULT 'pending'::character varying,
    google_last_synced_at timestamp without time zone,
    google_sync_error text,
    session_date_tz timestamp with time zone,
    end_date_tz timestamp with time zone,
    created_at_tz timestamp with time zone,
    updated_at_tz timestamp with time zone,
    meet_link character varying(500),
    therapy_session_id integer,
    CONSTRAINT video_sessions_google_sync_status_check CHECK (((google_sync_status)::text = ANY ((ARRAY['pending'::character varying, 'synced'::character varying, 'failed'::character varying, 'not_synced'::character varying])::text[]))),
    CONSTRAINT video_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE video_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.video_sessions IS 'Stores video conferencing sessions between partners and clients using Daily.co (previously Jitsi Meet)';


--
-- Name: COLUMN video_sessions.meeting_room_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.meeting_room_id IS 'Unique identifier for the meeting room, used as Daily.co room name (format: therapy-{partnerId}-{userId}-{timestamp})';


--
-- Name: COLUMN video_sessions.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.password IS 'Hashed password for session access (if password_enabled is true)';


--
-- Name: COLUMN video_sessions.password_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.password_enabled IS 'Whether password protection is enabled for this session';


--
-- Name: COLUMN video_sessions.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.timezone IS 'IANA timezone identifier for the user who created the video session (e.g., America/New_York, Asia/Kolkata)';


--
-- Name: COLUMN video_sessions.google_event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.google_event_id IS 'Google Calendar event ID for synced video sessions';


--
-- Name: COLUMN video_sessions.google_sync_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.google_sync_status IS 'Sync status: pending (not yet synced), synced (successful), failed (error occurred), not_synced (sync disabled or no Google connection)';


--
-- Name: COLUMN video_sessions.google_last_synced_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.google_last_synced_at IS 'Timestamp of last successful sync';


--
-- Name: COLUMN video_sessions.google_sync_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.google_sync_error IS 'Error message if sync failed';


--
-- Name: COLUMN video_sessions.session_date_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.session_date_tz IS 'Session start time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN video_sessions.end_date_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.end_date_tz IS 'Session end time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN video_sessions.created_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.created_at_tz IS 'Record creation time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN video_sessions.updated_at_tz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.updated_at_tz IS 'Record last update time (TIMESTAMPTZ) - Migration column';


--
-- Name: COLUMN video_sessions.meet_link; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.meet_link IS 'Google Meet link for the video session, generated via Google Calendar API';


--
-- Name: COLUMN video_sessions.therapy_session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.video_sessions.therapy_session_id IS 'Reference to the therapy session this video session was created for (if applicable). This is the reverse direction - when a video session is scheduled for an existing therapy session.';


--
-- Name: video_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.video_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: video_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.video_sessions_id_seq OWNED BY public.video_sessions.id;


--
-- Name: whatsapp_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_notifications (
    id integer NOT NULL,
    appointment_id integer,
    user_id integer,
    phone_number character varying(20) NOT NULL,
    message_type character varying(50) DEFAULT 'appointment_confirmation'::character varying NOT NULL,
    status character varying(20) NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    vonage_message_id character varying(100),
    partner_id integer
);


--
-- Name: TABLE whatsapp_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_notifications IS 'Stores WhatsApp notification attempts for appointment confirmations and partner-to-client messaging';


--
-- Name: COLUMN whatsapp_notifications.appointment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_notifications.appointment_id IS 'Appointment ID (for appointment-related notifications)';


--
-- Name: COLUMN whatsapp_notifications.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_notifications.status IS 'Current status of the WhatsApp message: pending, sent, failed, delivered, read';


--
-- Name: COLUMN whatsapp_notifications.vonage_message_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_notifications.vonage_message_id IS 'Vonage message ID for tracking message status';


--
-- Name: COLUMN whatsapp_notifications.partner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_notifications.partner_id IS 'Partner ID who sent the message (for partner-to-client messaging)';


--
-- Name: whatsapp_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_notifications_id_seq OWNED BY public.whatsapp_notifications.id;


--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: auth_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_credentials ALTER COLUMN id SET DEFAULT nextval('public.auth_credentials_id_seq'::regclass);


--
-- Name: availability_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots ALTER COLUMN id SET DEFAULT nextval('public.availability_slots_id_seq'::regclass);


--
-- Name: blogs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs ALTER COLUMN id SET DEFAULT nextval('public.blogs_id_seq'::regclass);


--
-- Name: case_histories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_histories ALTER COLUMN id SET DEFAULT nextval('public.case_histories_id_seq'::regclass);


--
-- Name: case_history_family_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_history_family_members ALTER COLUMN id SET DEFAULT nextval('public.case_history_family_members_id_seq'::regclass);


--
-- Name: contact_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_submissions ALTER COLUMN id SET DEFAULT nextval('public.contact_submissions_id_seq'::regclass);


--
-- Name: data_retention_policies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies ALTER COLUMN id SET DEFAULT nextval('public.data_retention_policies_id_seq'::regclass);


--
-- Name: earnings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earnings ALTER COLUMN id SET DEFAULT nextval('public.earnings_id_seq'::regclass);


--
-- Name: encryption_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_audit_log ALTER COLUMN id SET DEFAULT nextval('public.encryption_audit_log_id_seq'::regclass);


--
-- Name: encryption_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_keys ALTER COLUMN id SET DEFAULT nextval('public.encryption_keys_id_seq'::regclass);


--
-- Name: generated_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports ALTER COLUMN id SET DEFAULT nextval('public.generated_reports_id_seq'::regclass);


--
-- Name: google_calendar_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens ALTER COLUMN id SET DEFAULT nextval('public.google_calendar_tokens_id_seq'::regclass);


--
-- Name: mental_status_examinations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental_status_examinations ALTER COLUMN id SET DEFAULT nextval('public.mental_status_examinations_id_seq'::regclass);


--
-- Name: organization_signup_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_signup_tokens ALTER COLUMN id SET DEFAULT nextval('public.organization_signup_tokens_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: partner_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.partner_subscriptions_id_seq'::regclass);


--
-- Name: partners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners ALTER COLUMN id SET DEFAULT nextval('public.partners_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: payouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts ALTER COLUMN id SET DEFAULT nextval('public.payouts_id_seq'::regclass);


--
-- Name: questionnaire_answer_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_answer_options ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_answer_options_id_seq'::regclass);


--
-- Name: questionnaire_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_questions_id_seq'::regclass);


--
-- Name: questionnaire_shares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_shares ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_shares_id_seq'::regclass);


--
-- Name: questionnaires id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires ALTER COLUMN id SET DEFAULT nextval('public.questionnaires_id_seq'::regclass);


--
-- Name: razorpay_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_orders ALTER COLUMN id SET DEFAULT nextval('public.razorpay_orders_id_seq'::regclass);


--
-- Name: razorpay_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_payments ALTER COLUMN id SET DEFAULT nextval('public.razorpay_payments_id_seq'::regclass);


--
-- Name: razorpay_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.razorpay_subscriptions_id_seq'::regclass);


--
-- Name: razorpay_webhooks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_webhooks ALTER COLUMN id SET DEFAULT nextval('public.razorpay_webhooks_id_seq'::regclass);


--
-- Name: report_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN id SET DEFAULT nextval('public.report_templates_id_seq'::regclass);


--
-- Name: session_questionnaire_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_questionnaire_assignments ALTER COLUMN id SET DEFAULT nextval('public.session_questionnaire_assignments_id_seq'::regclass);


--
-- Name: shared_charts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_charts ALTER COLUMN id SET DEFAULT nextval('public.shared_charts_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: support_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations ALTER COLUMN id SET DEFAULT nextval('public.support_conversations_id_seq'::regclass);


--
-- Name: support_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages ALTER COLUMN id SET DEFAULT nextval('public.support_messages_id_seq'::regclass);


--
-- Name: therapy_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_sessions ALTER COLUMN id SET DEFAULT nextval('public.therapy_sessions_id_seq'::regclass);


--
-- Name: user_questionnaire_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_assignments ALTER COLUMN id SET DEFAULT nextval('public.user_questionnaire_assignments_id_seq'::regclass);


--
-- Name: user_questionnaire_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_responses ALTER COLUMN id SET DEFAULT nextval('public.user_questionnaire_responses_id_seq'::regclass);


--
-- Name: user_questionnaire_text_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_text_responses ALTER COLUMN id SET DEFAULT nextval('public.user_questionnaire_text_responses_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: video_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions ALTER COLUMN id SET DEFAULT nextval('public.video_sessions_id_seq'::regclass);


--
-- Name: whatsapp_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notifications ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_notifications_id_seq'::regclass);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: auth_credentials auth_credentials_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_credentials
    ADD CONSTRAINT auth_credentials_email_key UNIQUE (email);


--
-- Name: auth_credentials auth_credentials_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_credentials
    ADD CONSTRAINT auth_credentials_google_id_unique UNIQUE (google_id);


--
-- Name: auth_credentials auth_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_credentials
    ADD CONSTRAINT auth_credentials_pkey PRIMARY KEY (id);


--
-- Name: availability_slots availability_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_pkey PRIMARY KEY (id);


--
-- Name: blogs blogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_pkey PRIMARY KEY (id);


--
-- Name: case_histories case_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_histories
    ADD CONSTRAINT case_histories_pkey PRIMARY KEY (id);


--
-- Name: case_histories case_histories_user_id_partner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_histories
    ADD CONSTRAINT case_histories_user_id_partner_id_key UNIQUE (user_id, partner_id);


--
-- Name: case_history_family_members case_history_family_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_history_family_members
    ADD CONSTRAINT case_history_family_members_pkey PRIMARY KEY (id);


--
-- Name: contact_submissions contact_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_submissions
    ADD CONSTRAINT contact_submissions_pkey PRIMARY KEY (id);


--
-- Name: data_retention_policies data_retention_policies_organization_id_data_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_organization_id_data_type_key UNIQUE (organization_id, data_type);


--
-- Name: data_retention_policies data_retention_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_pkey PRIMARY KEY (id);


--
-- Name: earnings earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earnings
    ADD CONSTRAINT earnings_pkey PRIMARY KEY (id);


--
-- Name: encryption_audit_log encryption_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_pkey PRIMARY KEY (id);


--
-- Name: encryption_keys encryption_keys_key_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_key_id_key UNIQUE (key_id);


--
-- Name: encryption_keys encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (id);


--
-- Name: generated_reports generated_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_tokens google_calendar_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_tokens google_calendar_tokens_user_type_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_user_type_user_id_key UNIQUE (user_type, user_id);


--
-- Name: mental_status_examinations mental_status_examinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental_status_examinations
    ADD CONSTRAINT mental_status_examinations_pkey PRIMARY KEY (id);


--
-- Name: mental_status_examinations mental_status_examinations_user_partner_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental_status_examinations
    ADD CONSTRAINT mental_status_examinations_user_partner_unique UNIQUE (user_id, partner_id);


--
-- Name: migration_metadata migration_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_metadata
    ADD CONSTRAINT migration_metadata_pkey PRIMARY KEY (migration_name);


--
-- Name: organization_signup_tokens organization_signup_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_signup_tokens
    ADD CONSTRAINT organization_signup_tokens_pkey PRIMARY KEY (id);


--
-- Name: organization_signup_tokens organization_signup_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_signup_tokens
    ADD CONSTRAINT organization_signup_tokens_token_key UNIQUE (token);


--
-- Name: organizations organizations_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_email_key UNIQUE (email);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: partner_subscriptions partner_subscriptions_partner_id_subscription_plan_id_billi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_subscriptions
    ADD CONSTRAINT partner_subscriptions_partner_id_subscription_plan_id_billi_key UNIQUE (partner_id, subscription_plan_id, billing_period);


--
-- Name: partner_subscriptions partner_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_subscriptions
    ADD CONSTRAINT partner_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: partners partners_partner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_partner_id_key UNIQUE (partner_id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_answer_options questionnaire_answer_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_answer_options
    ADD CONSTRAINT questionnaire_answer_options_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_questions questionnaire_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_shares questionnaire_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_shares
    ADD CONSTRAINT questionnaire_shares_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_shares questionnaire_shares_questionnaire_id_shared_with_type_shar_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_shares
    ADD CONSTRAINT questionnaire_shares_questionnaire_id_shared_with_type_shar_key UNIQUE (questionnaire_id, shared_with_type, shared_with_id);


--
-- Name: questionnaires questionnaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_pkey PRIMARY KEY (id);


--
-- Name: razorpay_orders razorpay_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_orders
    ADD CONSTRAINT razorpay_orders_pkey PRIMARY KEY (id);


--
-- Name: razorpay_orders razorpay_orders_razorpay_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_orders
    ADD CONSTRAINT razorpay_orders_razorpay_order_id_key UNIQUE (razorpay_order_id);


--
-- Name: razorpay_payments razorpay_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_payments
    ADD CONSTRAINT razorpay_payments_pkey PRIMARY KEY (id);


--
-- Name: razorpay_payments razorpay_payments_razorpay_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_payments
    ADD CONSTRAINT razorpay_payments_razorpay_payment_id_key UNIQUE (razorpay_payment_id);


--
-- Name: razorpay_subscriptions razorpay_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_subscriptions
    ADD CONSTRAINT razorpay_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: razorpay_subscriptions razorpay_subscriptions_razorpay_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_subscriptions
    ADD CONSTRAINT razorpay_subscriptions_razorpay_subscription_id_key UNIQUE (razorpay_subscription_id);


--
-- Name: razorpay_webhooks razorpay_webhooks_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_webhooks
    ADD CONSTRAINT razorpay_webhooks_event_id_key UNIQUE (event_id);


--
-- Name: razorpay_webhooks razorpay_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_webhooks
    ADD CONSTRAINT razorpay_webhooks_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: session_questionnaire_assignments session_questionnaire_assignm_therapy_session_id_user_quest_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_questionnaire_assignments
    ADD CONSTRAINT session_questionnaire_assignm_therapy_session_id_user_quest_key UNIQUE (therapy_session_id, user_questionnaire_assignment_id);


--
-- Name: session_questionnaire_assignments session_questionnaire_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_questionnaire_assignments
    ADD CONSTRAINT session_questionnaire_assignments_pkey PRIMARY KEY (id);


--
-- Name: shared_charts shared_charts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_charts
    ADD CONSTRAINT shared_charts_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: support_conversations support_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: therapy_sessions therapy_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_sessions
    ADD CONSTRAINT therapy_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_partner_assignments user_partner_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_partner_assignments
    ADD CONSTRAINT user_partner_assignments_pkey PRIMARY KEY (user_id, partner_id);


--
-- Name: user_questionnaire_assignments user_questionnaire_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_assignments
    ADD CONSTRAINT user_questionnaire_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_questionnaire_responses user_questionnaire_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_responses
    ADD CONSTRAINT user_questionnaire_responses_pkey PRIMARY KEY (id);


--
-- Name: user_questionnaire_text_responses user_questionnaire_text_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_text_responses
    ADD CONSTRAINT user_questionnaire_text_responses_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: video_sessions video_sessions_meeting_room_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions
    ADD CONSTRAINT video_sessions_meeting_room_id_key UNIQUE (meeting_room_id);


--
-- Name: video_sessions video_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions
    ADD CONSTRAINT video_sessions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_notifications whatsapp_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notifications
    ADD CONSTRAINT whatsapp_notifications_pkey PRIMARY KEY (id);


--
-- Name: idx_admins_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_email ON public.admins USING btree (email);


--
-- Name: idx_appointments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_date ON public.appointments USING btree (appointment_date);


--
-- Name: idx_appointments_google_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_google_event ON public.appointments USING btree (google_event_id);


--
-- Name: idx_appointments_google_sync_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_google_sync_status ON public.appointments USING btree (google_sync_status);


--
-- Name: idx_appointments_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_partner ON public.appointments USING btree (partner_id);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_appointments_timezone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_timezone ON public.appointments USING btree (timezone);


--
-- Name: idx_appointments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_user ON public.appointments USING btree (user_id);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.encryption_audit_log USING btree (created_at);


--
-- Name: idx_audit_log_data_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_data_type ON public.encryption_audit_log USING btree (data_type);


--
-- Name: idx_audit_log_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_operation ON public.encryption_audit_log USING btree (operation);


--
-- Name: idx_audit_log_org_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_org_date ON public.encryption_audit_log USING btree (organization_id, created_at DESC);


--
-- Name: idx_audit_log_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_organization ON public.encryption_audit_log USING btree (organization_id);


--
-- Name: idx_audit_log_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_record ON public.encryption_audit_log USING btree (record_id, data_type);


--
-- Name: idx_audit_log_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_success ON public.encryption_audit_log USING btree (success);


--
-- Name: idx_audit_log_type_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_type_record ON public.encryption_audit_log USING btree (data_type, record_id, created_at DESC);


--
-- Name: idx_audit_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user ON public.encryption_audit_log USING btree (user_id);


--
-- Name: idx_audit_log_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_date ON public.encryption_audit_log USING btree (user_id, created_at DESC);


--
-- Name: idx_auth_credentials_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_credentials_email ON public.auth_credentials USING btree (email);


--
-- Name: idx_auth_credentials_google_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_credentials_google_id ON public.auth_credentials USING btree (google_id) WHERE (google_id IS NOT NULL);


--
-- Name: idx_availability_slots_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_archived ON public.availability_slots USING btree (archived_at);


--
-- Name: idx_availability_slots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_date ON public.availability_slots USING btree (slot_date);


--
-- Name: idx_availability_slots_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_datetime ON public.availability_slots USING btree (start_datetime, end_datetime);


--
-- Name: idx_availability_slots_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_partner ON public.availability_slots USING btree (partner_id);


--
-- Name: idx_availability_slots_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_published ON public.availability_slots USING btree (is_published);


--
-- Name: idx_availability_slots_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_status ON public.availability_slots USING btree (status);


--
-- Name: idx_availability_slots_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_user ON public.availability_slots USING btree (booked_by_user_id);


--
-- Name: idx_blogs_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogs_author ON public.blogs USING btree (author_id);


--
-- Name: idx_blogs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogs_category ON public.blogs USING btree (category);


--
-- Name: idx_blogs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogs_created_at ON public.blogs USING btree (created_at);


--
-- Name: idx_blogs_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogs_published ON public.blogs USING btree (published, published_at);


--
-- Name: idx_case_histories_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_histories_partner ON public.case_histories USING btree (partner_id);


--
-- Name: idx_case_histories_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_histories_user ON public.case_histories USING btree (user_id);


--
-- Name: idx_case_history_family_members_case_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_history_family_members_case_history ON public.case_history_family_members USING btree (case_history_id);


--
-- Name: idx_case_history_family_members_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_history_family_members_type ON public.case_history_family_members USING btree (member_type);


--
-- Name: idx_contact_submissions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions USING btree (created_at);


--
-- Name: idx_contact_submissions_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_submissions_email ON public.contact_submissions USING btree (email);


--
-- Name: idx_earnings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earnings_created_at ON public.earnings USING btree (created_at);


--
-- Name: idx_earnings_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earnings_payment_id ON public.earnings USING btree (razorpay_payment_id);


--
-- Name: idx_earnings_payout_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earnings_payout_date ON public.earnings USING btree (payout_date);


--
-- Name: idx_earnings_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earnings_recipient ON public.earnings USING btree (recipient_id, recipient_type);


--
-- Name: idx_earnings_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earnings_session_id ON public.earnings USING btree (session_id);


--
-- Name: idx_earnings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earnings_status ON public.earnings USING btree (status);


--
-- Name: idx_encryption_keys_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encryption_keys_created_at ON public.encryption_keys USING btree (created_at);


--
-- Name: idx_encryption_keys_data_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encryption_keys_data_type ON public.encryption_keys USING btree (data_type);


--
-- Name: idx_encryption_keys_key_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encryption_keys_key_id ON public.encryption_keys USING btree (key_id);


--
-- Name: idx_encryption_keys_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encryption_keys_organization ON public.encryption_keys USING btree (organization_id);


--
-- Name: idx_encryption_keys_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encryption_keys_type_status ON public.encryption_keys USING btree (key_type, status);


--
-- Name: idx_generated_reports_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_reports_partner_id ON public.generated_reports USING btree (partner_id);


--
-- Name: idx_generated_reports_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_reports_shared ON public.generated_reports USING btree (is_shared, user_id);


--
-- Name: idx_generated_reports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_reports_user_id ON public.generated_reports USING btree (user_id);


--
-- Name: idx_generated_reports_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_reports_viewed_at ON public.generated_reports USING btree (user_id, is_shared, viewed_at);


--
-- Name: idx_google_tokens_sync_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_tokens_sync_enabled ON public.google_calendar_tokens USING btree (sync_enabled);


--
-- Name: idx_google_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_tokens_user ON public.google_calendar_tokens USING btree (user_type, user_id);


--
-- Name: idx_mse_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mse_partner ON public.mental_status_examinations USING btree (partner_id);


--
-- Name: idx_mse_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mse_user ON public.mental_status_examinations USING btree (user_id);


--
-- Name: idx_org_signup_tokens_org_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_org_signup_tokens_org_active ON public.organization_signup_tokens USING btree (organization_id) WHERE (is_active = true);


--
-- Name: idx_org_signup_tokens_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_signup_tokens_org_id ON public.organization_signup_tokens USING btree (organization_id);


--
-- Name: idx_org_signup_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_signup_tokens_token ON public.organization_signup_tokens USING btree (token);


--
-- Name: idx_organizations_bank_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_bank_verified ON public.organizations USING btree (bank_account_verified);


--
-- Name: idx_organizations_cancelled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_cancelled ON public.organizations USING btree (is_cancelled) WHERE (is_cancelled = true);


--
-- Name: idx_organizations_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_is_active ON public.organizations USING btree (is_active);


--
-- Name: idx_organizations_query_resolver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_query_resolver ON public.organizations USING btree (query_resolver);


--
-- Name: idx_organizations_razorpay_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_razorpay_contact ON public.organizations USING btree (razorpay_contact_id);


--
-- Name: idx_organizations_razorpay_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_razorpay_subscription ON public.organizations USING btree (razorpay_subscription_id);


--
-- Name: idx_organizations_subscription_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_subscription_end_date ON public.organizations USING btree (subscription_end_date);


--
-- Name: idx_organizations_subscription_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_subscription_plan_id ON public.organizations USING btree (subscription_plan_id);


--
-- Name: idx_organizations_theraptrack_controlled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_theraptrack_controlled ON public.organizations USING btree (theraptrack_controlled);


--
-- Name: idx_organizations_video_sessions_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_video_sessions_enabled ON public.organizations USING btree (video_sessions_enabled);


--
-- Name: idx_partner_subscriptions_billing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_subscriptions_billing ON public.partner_subscriptions USING btree (billing_period);


--
-- Name: idx_partner_subscriptions_cancelled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_subscriptions_cancelled ON public.partner_subscriptions USING btree (is_cancelled) WHERE (is_cancelled = true);


--
-- Name: idx_partner_subscriptions_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_subscriptions_end_date ON public.partner_subscriptions USING btree (subscription_end_date);


--
-- Name: idx_partner_subscriptions_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_subscriptions_partner ON public.partner_subscriptions USING btree (partner_id);


--
-- Name: idx_partner_subscriptions_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_subscriptions_plan ON public.partner_subscriptions USING btree (subscription_plan_id);


--
-- Name: idx_partner_subscriptions_razorpay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_subscriptions_razorpay ON public.partner_subscriptions USING btree (razorpay_subscription_id);


--
-- Name: idx_partners_bank_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_bank_verified ON public.partners USING btree (bank_account_verified);


--
-- Name: idx_partners_default_report_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_default_report_template ON public.partners USING btree (default_report_template_id);


--
-- Name: idx_partners_default_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_default_template ON public.partners USING btree (default_report_template_id);


--
-- Name: idx_partners_email_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_email_verified ON public.partners USING btree (email_verified);


--
-- Name: idx_partners_fee_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_fee_range ON public.partners USING btree (fee_min, fee_max) WHERE ((fee_min IS NOT NULL) AND (fee_max IS NOT NULL));


--
-- Name: idx_partners_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_is_active ON public.partners USING btree (is_active);


--
-- Name: idx_partners_language_preferences; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_language_preferences ON public.partners USING gin (to_tsvector('english'::regconfig, COALESCE(language_preferences, ''::text)));


--
-- Name: idx_partners_license_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_license_id ON public.partners USING btree (license_id);


--
-- Name: idx_partners_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_organization ON public.partners USING btree (organization_id);


--
-- Name: idx_partners_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_partner_id ON public.partners USING btree (partner_id);


--
-- Name: idx_partners_qualification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_qualification ON public.partners USING btree (qualification);


--
-- Name: idx_partners_query_resolver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_query_resolver ON public.partners USING btree (query_resolver);


--
-- Name: idx_partners_razorpay_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_razorpay_contact ON public.partners USING btree (razorpay_contact_id);


--
-- Name: idx_partners_report_background; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_report_background ON public.partners USING btree (default_report_background);


--
-- Name: idx_partners_verification_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_verification_token ON public.partners USING btree (verification_token);


--
-- Name: idx_partners_video_sessions_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_video_sessions_enabled ON public.partners USING btree (video_sessions_enabled);


--
-- Name: idx_password_reset_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_email ON public.password_reset_tokens USING btree (email);


--
-- Name: idx_password_reset_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_payouts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_created_at ON public.payouts USING btree (created_at);


--
-- Name: idx_payouts_payout_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_payout_date ON public.payouts USING btree (payout_date);


--
-- Name: idx_payouts_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_recipient ON public.payouts USING btree (recipient_id, recipient_type);


--
-- Name: idx_payouts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_status ON public.payouts USING btree (status);


--
-- Name: idx_questionnaire_answer_options_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_answer_options_order ON public.questionnaire_answer_options USING btree (question_id, option_order);


--
-- Name: idx_questionnaire_answer_options_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_answer_options_question_id ON public.questionnaire_answer_options USING btree (question_id);


--
-- Name: idx_questionnaire_questions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_questions_order ON public.questionnaire_questions USING btree (questionnaire_id, question_order);


--
-- Name: idx_questionnaire_questions_questionnaire_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_questions_questionnaire_id ON public.questionnaire_questions USING btree (questionnaire_id);


--
-- Name: idx_questionnaire_questions_sub_heading; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_questions_sub_heading ON public.questionnaire_questions USING btree (questionnaire_id, sub_heading);


--
-- Name: idx_questionnaire_shares_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_shares_org ON public.questionnaire_shares USING btree (shared_with_id) WHERE ((shared_with_type)::text = 'organization'::text);


--
-- Name: idx_questionnaire_shares_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_shares_partner ON public.questionnaire_shares USING btree (shared_with_id) WHERE ((shared_with_type)::text = 'partner'::text);


--
-- Name: idx_questionnaire_shares_questionnaire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_shares_questionnaire ON public.questionnaire_shares USING btree (questionnaire_id);


--
-- Name: idx_questionnaire_shares_shared_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_shares_shared_by ON public.questionnaire_shares USING btree (shared_by_type, shared_by_id);


--
-- Name: idx_questionnaire_shares_shared_with; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_shares_shared_with ON public.questionnaire_shares USING btree (shared_with_type, shared_with_id);


--
-- Name: idx_questionnaires_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaires_admin_id ON public.questionnaires USING btree (admin_id);


--
-- Name: idx_questionnaires_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaires_created_at ON public.questionnaires USING btree (created_at);


--
-- Name: idx_questionnaires_created_by_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaires_created_by_type ON public.questionnaires USING btree (created_by_type);


--
-- Name: idx_questionnaires_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaires_organization_id ON public.questionnaires USING btree (organization_id);


--
-- Name: idx_questionnaires_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaires_partner_id ON public.questionnaires USING btree (partner_id);


--
-- Name: idx_razorpay_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_orders_customer ON public.razorpay_orders USING btree (customer_id, customer_type);


--
-- Name: idx_razorpay_orders_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_orders_order_id ON public.razorpay_orders USING btree (razorpay_order_id);


--
-- Name: idx_razorpay_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_orders_status ON public.razorpay_orders USING btree (status);


--
-- Name: idx_razorpay_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_payments_created_at ON public.razorpay_payments USING btree (created_at);


--
-- Name: idx_razorpay_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_payments_customer ON public.razorpay_payments USING btree (customer_id, customer_type);


--
-- Name: idx_razorpay_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_payments_order_id ON public.razorpay_payments USING btree (razorpay_order_id);


--
-- Name: idx_razorpay_payments_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_payments_payment_id ON public.razorpay_payments USING btree (razorpay_payment_id);


--
-- Name: idx_razorpay_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_payments_status ON public.razorpay_payments USING btree (status);


--
-- Name: idx_razorpay_payments_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_payments_subscription_id ON public.razorpay_payments USING btree (razorpay_subscription_id);


--
-- Name: idx_razorpay_subscriptions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_subscriptions_customer ON public.razorpay_subscriptions USING btree (customer_id, customer_type);


--
-- Name: idx_razorpay_subscriptions_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_subscriptions_plan ON public.razorpay_subscriptions USING btree (subscription_plan_id);


--
-- Name: idx_razorpay_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_subscriptions_status ON public.razorpay_subscriptions USING btree (status);


--
-- Name: idx_razorpay_subscriptions_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_subscriptions_subscription_id ON public.razorpay_subscriptions USING btree (razorpay_subscription_id);


--
-- Name: idx_razorpay_webhooks_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_webhooks_event_id ON public.razorpay_webhooks USING btree (event_id);


--
-- Name: idx_razorpay_webhooks_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_webhooks_event_type ON public.razorpay_webhooks USING btree (event_type);


--
-- Name: idx_razorpay_webhooks_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_webhooks_processed ON public.razorpay_webhooks USING btree (processed);


--
-- Name: idx_report_templates_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_templates_created_at ON public.report_templates USING btree (created_at DESC);


--
-- Name: idx_retention_policies_data_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retention_policies_data_type ON public.data_retention_policies USING btree (data_type);


--
-- Name: idx_retention_policies_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retention_policies_organization ON public.data_retention_policies USING btree (organization_id);


--
-- Name: idx_session_questionnaire_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_questionnaire_assignment ON public.session_questionnaire_assignments USING btree (user_questionnaire_assignment_id);


--
-- Name: idx_session_questionnaire_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_questionnaire_session ON public.session_questionnaire_assignments USING btree (therapy_session_id);


--
-- Name: idx_shared_charts_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_charts_partner ON public.shared_charts USING btree (partner_id);


--
-- Name: idx_shared_charts_partner_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_charts_partner_user ON public.shared_charts USING btree (partner_id, user_id);


--
-- Name: idx_shared_charts_questionnaire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_charts_questionnaire ON public.shared_charts USING btree (questionnaire_id);


--
-- Name: idx_shared_charts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_charts_user ON public.shared_charts USING btree (user_id);


--
-- Name: idx_subscription_plans_has_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_has_video ON public.subscription_plans USING btree (has_video);


--
-- Name: idx_subscription_plans_has_whatsapp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_has_whatsapp ON public.subscription_plans USING btree (has_whatsapp);


--
-- Name: idx_subscription_plans_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_is_active ON public.subscription_plans USING btree (is_active);


--
-- Name: idx_subscription_plans_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_order ON public.subscription_plans USING btree (plan_order);


--
-- Name: idx_subscription_plans_plan_duration_days; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_plan_duration_days ON public.subscription_plans USING btree (plan_duration_days);


--
-- Name: idx_subscription_plans_plan_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_plan_type ON public.subscription_plans USING btree (plan_type);


--
-- Name: idx_subscription_plans_therapist_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_therapist_range ON public.subscription_plans USING btree (min_therapists, max_therapists);


--
-- Name: idx_support_conversations_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_last_message ON public.support_conversations USING btree (last_message_at DESC);


--
-- Name: idx_support_conversations_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_priority ON public.support_conversations USING btree (priority DESC, status, last_message_at DESC);


--
-- Name: idx_support_conversations_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_requester ON public.support_conversations USING btree (requester_type, requester_id);


--
-- Name: idx_support_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_status ON public.support_conversations USING btree (status);


--
-- Name: idx_support_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_conversation ON public.support_messages USING btree (conversation_id);


--
-- Name: idx_support_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_created ON public.support_messages USING btree (created_at);


--
-- Name: idx_support_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_sender ON public.support_messages USING btree (sender_type, sender_id);


--
-- Name: idx_therapy_sessions_appointment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapy_sessions_appointment ON public.therapy_sessions USING btree (appointment_id);


--
-- Name: idx_therapy_sessions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapy_sessions_created ON public.therapy_sessions USING btree (created_at);


--
-- Name: idx_therapy_sessions_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapy_sessions_partner ON public.therapy_sessions USING btree (partner_id);


--
-- Name: idx_therapy_sessions_session_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapy_sessions_session_number ON public.therapy_sessions USING btree (user_id, partner_id, session_number);


--
-- Name: idx_therapy_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapy_sessions_status ON public.therapy_sessions USING btree (status);


--
-- Name: idx_therapy_sessions_unique_appointment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_therapy_sessions_unique_appointment ON public.therapy_sessions USING btree (appointment_id) WHERE (appointment_id IS NOT NULL);


--
-- Name: idx_therapy_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapy_sessions_user ON public.therapy_sessions USING btree (user_id);


--
-- Name: idx_therapy_sessions_video_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapy_sessions_video_session ON public.therapy_sessions USING btree (video_session_id);


--
-- Name: idx_unique_partner_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_partner_slot ON public.availability_slots USING btree (partner_id, start_datetime) WHERE (archived_at IS NULL);


--
-- Name: idx_user_questionnaire_assignments_assigned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_assignments_assigned_at ON public.user_questionnaire_assignments USING btree (assigned_at);


--
-- Name: idx_user_questionnaire_assignments_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_assignments_partner_id ON public.user_questionnaire_assignments USING btree (partner_id);


--
-- Name: idx_user_questionnaire_assignments_questionnaire_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_assignments_questionnaire_id ON public.user_questionnaire_assignments USING btree (questionnaire_id);


--
-- Name: idx_user_questionnaire_assignments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_assignments_status ON public.user_questionnaire_assignments USING btree (status);


--
-- Name: idx_user_questionnaire_assignments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_assignments_user_id ON public.user_questionnaire_assignments USING btree (user_id);


--
-- Name: idx_user_questionnaire_responses_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_responses_assignment_id ON public.user_questionnaire_responses USING btree (assignment_id);


--
-- Name: idx_user_questionnaire_responses_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_responses_question_id ON public.user_questionnaire_responses USING btree (question_id);


--
-- Name: idx_user_questionnaire_responses_responded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_responses_responded_at ON public.user_questionnaire_responses USING btree (responded_at);


--
-- Name: idx_user_questionnaire_responses_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_responses_session_id ON public.user_questionnaire_responses USING btree (session_id);


--
-- Name: idx_user_questionnaire_text_responses_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_questionnaire_text_responses_assignment_id ON public.user_questionnaire_text_responses USING btree (assignment_id);


--
-- Name: idx_video_sessions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_date ON public.video_sessions USING btree (session_date);


--
-- Name: idx_video_sessions_google_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_google_event ON public.video_sessions USING btree (google_event_id);


--
-- Name: idx_video_sessions_google_sync_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_google_sync_status ON public.video_sessions USING btree (google_sync_status);


--
-- Name: idx_video_sessions_meet_link; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_meet_link ON public.video_sessions USING btree (meet_link);


--
-- Name: idx_video_sessions_meeting_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_meeting_room ON public.video_sessions USING btree (meeting_room_id);


--
-- Name: idx_video_sessions_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_partner ON public.video_sessions USING btree (partner_id);


--
-- Name: idx_video_sessions_partner_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_partner_user ON public.video_sessions USING btree (partner_id, user_id);


--
-- Name: idx_video_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_status ON public.video_sessions USING btree (status);


--
-- Name: idx_video_sessions_therapy_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_therapy_session ON public.video_sessions USING btree (therapy_session_id);


--
-- Name: idx_video_sessions_timezone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_timezone ON public.video_sessions USING btree (timezone);


--
-- Name: idx_video_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_sessions_user ON public.video_sessions USING btree (user_id);


--
-- Name: idx_whatsapp_notifications_appointment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_notifications_appointment ON public.whatsapp_notifications USING btree (appointment_id);


--
-- Name: idx_whatsapp_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_notifications_created_at ON public.whatsapp_notifications USING btree (created_at DESC);


--
-- Name: idx_whatsapp_notifications_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_notifications_partner ON public.whatsapp_notifications USING btree (partner_id);


--
-- Name: idx_whatsapp_notifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_notifications_status ON public.whatsapp_notifications USING btree (status);


--
-- Name: idx_whatsapp_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_notifications_user ON public.whatsapp_notifications USING btree (user_id);


--
-- Name: idx_whatsapp_notifications_vonage_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_notifications_vonage_id ON public.whatsapp_notifications USING btree (vonage_message_id);


--
-- Name: subscription_plans ensure_monthly_plans_enabled_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_monthly_plans_enabled_trigger BEFORE INSERT OR UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.ensure_monthly_plans_enabled();


--
-- Name: generated_reports generated_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generated_reports_updated_at BEFORE UPDATE ON public.generated_reports FOR EACH ROW EXECUTE FUNCTION public.update_generated_report_timestamp();


--
-- Name: report_templates report_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER report_templates_updated_at BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.update_report_template_timestamp();


--
-- Name: subscription_plans subscription_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_subscription_plans_updated_at();


--
-- Name: questionnaires trigger_update_questionnaires_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_questionnaires_updated_at BEFORE UPDATE ON public.questionnaires FOR EACH ROW EXECUTE FUNCTION public.update_questionnaires_updated_at();


--
-- Name: case_histories update_case_histories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_case_histories_updated_at BEFORE UPDATE ON public.case_histories FOR EACH ROW EXECUTE FUNCTION public.update_case_history_updated_at();


--
-- Name: case_history_family_members update_case_history_family_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_case_history_family_members_updated_at BEFORE UPDATE ON public.case_history_family_members FOR EACH ROW EXECUTE FUNCTION public.update_case_history_updated_at();


--
-- Name: support_messages update_support_conversation_on_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_conversation_on_message AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.update_support_conversation_timestamp();


--
-- Name: whatsapp_notifications whatsapp_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER whatsapp_notifications_updated_at BEFORE UPDATE ON public.whatsapp_notifications FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_notifications_updated_at();


--
-- Name: appointments appointments_encryption_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_encryption_key_id_fkey FOREIGN KEY (encryption_key_id) REFERENCES public.encryption_keys(key_id);


--
-- Name: appointments appointments_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: availability_slots availability_slots_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: availability_slots availability_slots_booked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_booked_by_user_id_fkey FOREIGN KEY (booked_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: availability_slots availability_slots_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: blogs blogs_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: case_histories case_histories_encryption_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_histories
    ADD CONSTRAINT case_histories_encryption_key_id_fkey FOREIGN KEY (encryption_key_id) REFERENCES public.encryption_keys(key_id);


--
-- Name: case_histories case_histories_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_histories
    ADD CONSTRAINT case_histories_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: case_histories case_histories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_histories
    ADD CONSTRAINT case_histories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: case_history_family_members case_history_family_members_case_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_history_family_members
    ADD CONSTRAINT case_history_family_members_case_history_id_fkey FOREIGN KEY (case_history_id) REFERENCES public.case_histories(id) ON DELETE CASCADE;


--
-- Name: data_retention_policies data_retention_policies_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: earnings earnings_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earnings
    ADD CONSTRAINT earnings_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: earnings earnings_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earnings
    ADD CONSTRAINT earnings_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.payouts(id) ON DELETE SET NULL;


--
-- Name: earnings earnings_razorpay_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earnings
    ADD CONSTRAINT earnings_razorpay_payment_id_fkey FOREIGN KEY (razorpay_payment_id) REFERENCES public.razorpay_payments(razorpay_payment_id) ON DELETE SET NULL;


--
-- Name: earnings earnings_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earnings
    ADD CONSTRAINT earnings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.therapy_sessions(id) ON DELETE SET NULL;


--
-- Name: encryption_audit_log encryption_audit_log_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.encryption_keys(key_id) ON DELETE SET NULL;


--
-- Name: encryption_audit_log encryption_audit_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: encryption_audit_log encryption_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: encryption_keys encryption_keys_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens fk_password_reset_email; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT fk_password_reset_email FOREIGN KEY (email) REFERENCES public.auth_credentials(email) ON DELETE CASCADE;


--
-- Name: CONSTRAINT fk_password_reset_email ON password_reset_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT fk_password_reset_email ON public.password_reset_tokens IS 'Cascade delete password reset tokens when auth credentials are deleted';


--
-- Name: generated_reports generated_reports_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: generated_reports generated_reports_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id) ON DELETE SET NULL;


--
-- Name: generated_reports generated_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mental_status_examinations mental_status_examinations_encryption_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental_status_examinations
    ADD CONSTRAINT mental_status_examinations_encryption_key_id_fkey FOREIGN KEY (encryption_key_id) REFERENCES public.encryption_keys(key_id);


--
-- Name: mental_status_examinations mental_status_examinations_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental_status_examinations
    ADD CONSTRAINT mental_status_examinations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: mental_status_examinations mental_status_examinations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental_status_examinations
    ADD CONSTRAINT mental_status_examinations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organization_signup_tokens organization_signup_tokens_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_signup_tokens
    ADD CONSTRAINT organization_signup_tokens_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_deactivated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES public.admins(id);


--
-- Name: organizations organizations_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL;


--
-- Name: partner_subscriptions partner_subscriptions_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_subscriptions
    ADD CONSTRAINT partner_subscriptions_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: partner_subscriptions partner_subscriptions_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_subscriptions
    ADD CONSTRAINT partner_subscriptions_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;


--
-- Name: partners partners_deactivated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES public.organizations(id);


--
-- Name: partners partners_default_report_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_default_report_template_id_fkey FOREIGN KEY (default_report_template_id) REFERENCES public.report_templates(id) ON DELETE SET NULL;


--
-- Name: partners partners_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: questionnaire_answer_options questionnaire_answer_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_answer_options
    ADD CONSTRAINT questionnaire_answer_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE;


--
-- Name: questionnaire_questions questionnaire_questions_questionnaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_questionnaire_id_fkey FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaires(id) ON DELETE CASCADE;


--
-- Name: questionnaire_shares questionnaire_shares_questionnaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_shares
    ADD CONSTRAINT questionnaire_shares_questionnaire_id_fkey FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaires(id) ON DELETE CASCADE;


--
-- Name: questionnaires questionnaires_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- Name: questionnaires questionnaires_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: questionnaires questionnaires_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: razorpay_orders razorpay_orders_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_orders
    ADD CONSTRAINT razorpay_orders_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL;


--
-- Name: razorpay_payments razorpay_payments_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_payments
    ADD CONSTRAINT razorpay_payments_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL;


--
-- Name: razorpay_subscriptions razorpay_subscriptions_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_subscriptions
    ADD CONSTRAINT razorpay_subscriptions_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;


--
-- Name: report_templates report_templates_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.admins(id) ON DELETE SET NULL;


--
-- Name: session_questionnaire_assignments session_questionnaire_assignm_user_questionnaire_assignmen_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_questionnaire_assignments
    ADD CONSTRAINT session_questionnaire_assignm_user_questionnaire_assignmen_fkey FOREIGN KEY (user_questionnaire_assignment_id) REFERENCES public.user_questionnaire_assignments(id) ON DELETE CASCADE;


--
-- Name: session_questionnaire_assignments session_questionnaire_assignments_therapy_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_questionnaire_assignments
    ADD CONSTRAINT session_questionnaire_assignments_therapy_session_id_fkey FOREIGN KEY (therapy_session_id) REFERENCES public.therapy_sessions(id) ON DELETE CASCADE;


--
-- Name: shared_charts shared_charts_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_charts
    ADD CONSTRAINT shared_charts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: shared_charts shared_charts_questionnaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_charts
    ADD CONSTRAINT shared_charts_questionnaire_id_fkey FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaires(id) ON DELETE CASCADE;


--
-- Name: shared_charts shared_charts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_charts
    ADD CONSTRAINT shared_charts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_conversations support_conversations_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL;


--
-- Name: support_messages support_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.support_conversations(id) ON DELETE CASCADE;


--
-- Name: therapy_sessions therapy_sessions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_sessions
    ADD CONSTRAINT therapy_sessions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: therapy_sessions therapy_sessions_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_sessions
    ADD CONSTRAINT therapy_sessions_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: therapy_sessions therapy_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_sessions
    ADD CONSTRAINT therapy_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: therapy_sessions therapy_sessions_video_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_sessions
    ADD CONSTRAINT therapy_sessions_video_session_id_fkey FOREIGN KEY (video_session_id) REFERENCES public.video_sessions(id) ON DELETE SET NULL;


--
-- Name: user_partner_assignments user_partner_assignments_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_partner_assignments
    ADD CONSTRAINT user_partner_assignments_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: user_partner_assignments user_partner_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_partner_assignments
    ADD CONSTRAINT user_partner_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_questionnaire_assignments user_questionnaire_assignments_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_assignments
    ADD CONSTRAINT user_questionnaire_assignments_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: user_questionnaire_assignments user_questionnaire_assignments_questionnaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_assignments
    ADD CONSTRAINT user_questionnaire_assignments_questionnaire_id_fkey FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaires(id) ON DELETE CASCADE;


--
-- Name: user_questionnaire_assignments user_questionnaire_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_assignments
    ADD CONSTRAINT user_questionnaire_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_questionnaire_responses user_questionnaire_responses_answer_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_responses
    ADD CONSTRAINT user_questionnaire_responses_answer_option_id_fkey FOREIGN KEY (answer_option_id) REFERENCES public.questionnaire_answer_options(id) ON DELETE CASCADE;


--
-- Name: user_questionnaire_responses user_questionnaire_responses_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_responses
    ADD CONSTRAINT user_questionnaire_responses_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.user_questionnaire_assignments(id) ON DELETE CASCADE;


--
-- Name: user_questionnaire_responses user_questionnaire_responses_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_responses
    ADD CONSTRAINT user_questionnaire_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE;


--
-- Name: user_questionnaire_responses user_questionnaire_responses_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_responses
    ADD CONSTRAINT user_questionnaire_responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.therapy_sessions(id) ON DELETE SET NULL;


--
-- Name: user_questionnaire_text_responses user_questionnaire_text_responses_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire_text_responses
    ADD CONSTRAINT user_questionnaire_text_responses_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.user_questionnaire_assignments(id) ON DELETE CASCADE;


--
-- Name: video_sessions video_sessions_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions
    ADD CONSTRAINT video_sessions_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: video_sessions video_sessions_therapy_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions
    ADD CONSTRAINT video_sessions_therapy_session_id_fkey FOREIGN KEY (therapy_session_id) REFERENCES public.therapy_sessions(id) ON DELETE SET NULL;


--
-- Name: video_sessions video_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions
    ADD CONSTRAINT video_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_notifications whatsapp_notifications_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notifications
    ADD CONSTRAINT whatsapp_notifications_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: whatsapp_notifications whatsapp_notifications_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notifications
    ADD CONSTRAINT whatsapp_notifications_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;


--
-- Name: whatsapp_notifications whatsapp_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notifications
    ADD CONSTRAINT whatsapp_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict b9GxfO7dyL1TGrHObbzcJTmM98fFCp0fBDHbzcafhLQNpUOFuFyzypfgrfCAUbB

