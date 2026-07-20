import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialisation du client Supabase avec service role (côté serveur)
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-488793d3/health", (c) => {
  return c.json({ 
    status: "ok",
    supabase: {
      connected: !!supabaseUrl && !!supabaseServiceKey,
      url: supabaseUrl ? 'configured' : 'missing'
    }
  });
});

// Test endpoint KV Store
app.get("/make-server-488793d3/kv/test", async (c) => {
  try {
    await kv.set('test_connection', { timestamp: new Date().toISOString(), message: 'Julaba connected!' });
    const result = await kv.get('test_connection');
    return c.json({ 
      status: "success",
      kv_test: result
    });
  } catch (error) {
    return c.json({ 
      status: "error", 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Exemple endpoint protégé avec auth Supabase
app.post("/make-server-488793d3/protected-example", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token manquant' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Non autorisé' }, 401);
    }

    return c.json({ 
      status: "success",
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// AUTHENTIFICATION JÙLABA - MIGRATION PROGRESSIVE SEMAINE 1
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /signup - Inscription nouvel utilisateur
 * Body: { phone, password, firstName, lastName, role, region, commune, activity }
 */
app.post("/make-server-488793d3/auth/users/create", async (c) => {
  try {
    const body = await c.req.json();
    const { phone, password, firstName, lastName, role, region, commune, activity, market, cooperativeName, institutionName } = body;

    // Validation des champs obligatoires
    if (!phone || !password || !firstName || !lastName || !role) {
      return c.json({ 
        error: 'Champs obligatoires manquants',
        required: ['phone', 'password', 'firstName', 'lastName', 'role']
      }, 400);
    }

    // Vérifier que le rôle est valide
    const validRoles = [
      'marchand', 
      'producteur', 
      'cooperative', 
      'institution', 
      'identificateur', 
      'consommateur',
      'super_admin',
      'admin_national',
      'gestionnaire_zone',
      'operateur_terrain'
    ];
    if (!validRoles.includes(role)) {
      return c.json({ 
        error: 'Rôle invalide',
        validRoles
      }, 400);
    }

    // Vérifier si le téléphone existe déjà
    const { data: existingUser } = await supabase
      .from('users_julaba')
      .select('phone')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return c.json({ error: 'Ce numéro de téléphone est déjà enregistré' }, 409);
    }

    // Créer l'utilisateur dans Supabase Auth avec le téléphone comme email
    // Format: phone@julaba.local (car Supabase nécessite un email)
    const authEmail = `${phone}@julaba.local`;
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: password,
      email_confirm: true, // Auto-confirmer car pas de serveur email configuré
      user_metadata: {
        phone,
        first_name: firstName,
        last_name: lastName,
        role
      }
    });

    if (authError) {
      return c.json({ 
        error: 'Erreur lors de la création du compte',
        details: authError.message 
      }, 500);
    }

    // Créer le profil utilisateur dans users_julaba
    const { data: userProfile, error: profileError } = await supabase
      .from('users_julaba')
      .insert({
        auth_user_id: authData.user.id,
        phone,
        first_name: firstName,
        last_name: lastName,
        role,
        region: region || null,
        commune: commune || null,
        activity: activity || null,
        market: market || null,
        cooperative_name: cooperativeName || null,
        institution_name: institutionName || null,
        score: 50, // Score initial
        validated: false,
        verified_phone: true // Considéré vérifié car utilisé pour signup
      })
      .select()
      .single();

    if (profileError) {
      // Nettoyer l'utilisateur auth si la création du profil échoue
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ 
        error: 'Erreur lors de la création du profil',
        details: profileError.message 
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        id: userProfile.id,
        phone: userProfile.phone,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: userProfile.role,
        score: userProfile.score
      }
    }, 201);

  } catch (error) {
    return c.json({ 
      error: 'Erreur serveur lors de l\'inscription',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * POST /login - Connexion utilisateur
 * Body: { phone, password }
 */
app.post("/make-server-488793d3/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return c.json({ 
        error: 'Téléphone et mot de passe requis' 
      }, 400);
    }

    // Connexion avec email format (phone@julaba.local)
    const authEmail = `${phone}@julaba.local`;
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: password
    });

    if (authError) {
      return c.json({ 
        error: 'Identifiants incorrects',
        details: authError.message
      }, 401);
    }

    // Récupérer le profil utilisateur complet
    const { data: userProfile, error: profileError } = await supabase
      .from('users_julaba')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (profileError || !userProfile) {
      return c.json({ 
        error: 'Profil utilisateur introuvable' 
      }, 404);
    }

    // Mettre à jour last_login_at
    await supabase
      .from('users_julaba')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userProfile.id);

    return c.json({
      success: true,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      user: {
        id: userProfile.id,
        phone: userProfile.phone,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: userProfile.role,
        region: userProfile.region,
        commune: userProfile.commune,
        activity: userProfile.activity,
        market: userProfile.market,
        cooperativeName: userProfile.cooperative_name,
        institutionName: userProfile.institution_name,
        score: userProfile.score,
        validated: userProfile.validated,
        createdAt: userProfile.created_at
      }
    });

  } catch (error) {
    return c.json({ 
      error: 'Erreur serveur lors de la connexion',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * GET /me - Récupérer le profil de l'utilisateur connecté
 * Header: Authorization: Bearer {accessToken}
 */
app.get("/make-server-488793d3/auth/me", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token d\'authentification manquant' }, 401);
    }

    // Vérifier le token
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: 'Token invalide ou expiré' }, 401);
    }

    // Récupérer le profil complet
    const { data: userProfile, error: profileError } = await supabase
      .from('users_julaba')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return c.json({ error: 'Profil utilisateur introuvable' }, 404);
    }

    return c.json({
      success: true,
      user: {
        id: userProfile.id,
        phone: userProfile.phone,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: userProfile.role,
        region: userProfile.region,
        commune: userProfile.commune,
        activity: userProfile.activity,
        market: userProfile.market,
        cooperativeName: userProfile.cooperative_name,
        institutionName: userProfile.institution_name,
        score: userProfile.score,
        validated: userProfile.validated,
        photoUrl: userProfile.photo_url,
        createdAt: userProfile.created_at,
        lastLoginAt: userProfile.last_login_at
      }
    });

  } catch (error) {
    return c.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * POST /logout - Déconnexion (invalider le token)
 * Header: Authorization: Bearer {accessToken}
 */
app.post("/make-server-488793d3/auth/logout", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token d\'authentification manquant' }, 401);
    }

    // Supabase gère automatiquement l'invalidation du token
    const { error } = await supabase.auth.admin.signOut(accessToken);

    if (error) {
      // On continue quand même car le client peut supprimer le token localement
    }

    return c.json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    return c.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// TANTIE SAGESSE - ELEVENLABS TEXT-TO-SPEECH
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /tts/speak - Génération audio via ElevenLabs
 * Body: { text: string, voiceId?: string }
 * Retourne l'audio en base64 pour lecture immédiate
 */
app.post("/make-server-488793d3/tts/speak", async (c) => {
  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!apiKey) {
      return c.json({ 
        error: 'Service de synthèse vocale non configuré',
        details: 'ELEVENLABS_API_KEY manquante'
      }, 503);
    }

    const body = await c.req.json();
    const { text, voiceId } = body;

    if (!text || text.trim().length === 0) {
      return c.json({ error: 'Texte requis pour la synthèse vocale' }, 400);
    }

    // Voix par défaut : Charlotte (voix féminine française professionnelle)
    // Autres options recommandées : "pNInz6obpgDQGcFmaJgB" (Adam - voix masculine)
    const selectedVoiceId = voiceId || "XB0fDUnXU5powFXDhCwa";

    // Appel à l'API ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2', // Meilleur modèle pour le français
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
:`, errorText);
      return c.json({ 
        error: 'Erreur lors de la génération audio',
        details: `ElevenLabs API returned ${response.status}`,
        message: errorText
      }, response.status);
    }

    // Convertir l'audio en base64 pour l'envoyer au frontend
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(audioBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    return c.json({
      success: true,
      audio: base64Audio,
      contentType: 'audio/mpeg',
      voiceId: selectedVoiceId
    });

  } catch (error) {
    return c.json({ 
      error: 'Erreur serveur lors de la synthèse vocale',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * GET /tts/voices - Liste des voix ElevenLabs disponibles
 */
app.get("/make-server-488793d3/tts/voices", async (c) => {
  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!apiKey) {
      return c.json({ 
        success: false,
        error: 'Service de synthèse vocale non configuré',
        details: 'La clé API ELEVENLABS_API_KEY doit être ajoutée dans les Secrets Supabase'
      }, 503);
    }
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
:`, errorText);
      return c.json({ 
        success: false,
        error: 'Erreur lors de la récupération des voix',
        details: errorText,
        status: response.status
      }, response.status);
    }

    const data = await response.json();
    
    return c.json({
      success: true,
      voices: data.voices || []
    });

  } catch (error) {
    return c.json({ 
      success: false,
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

Deno.serve(app.fetch);