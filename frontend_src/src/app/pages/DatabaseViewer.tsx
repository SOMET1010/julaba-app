/**
 * Visualiseur de structure de base de données Jùlaba
 */

import React, { useState } from 'react';
import { Database, Table, Key, Users, Settings, ChevronDown, ChevronRight } from 'lucide-react';

interface Column {
  name: string;
  type: string;
  constraints?: string;
  description: string;
}

interface TableSchema {
  name: string;
  description: string;
  icon: any;
  color: string;
  columns: Column[];
}

const tables: TableSchema[] = [
  {
    name: 'users_julaba',
    description: 'Profils utilisateurs des 6 types d\'acteurs Jùlaba',
    icon: Users,
    color: 'blue',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PK, AUTO', description: 'Identifiant unique' },
      { name: 'auth_user_id', type: 'UUID', constraints: 'FK, UNIQUE', description: 'Référence vers auth.users' },
      { name: 'phone', type: 'VARCHAR(10)', constraints: 'UNIQUE, NOT NULL', description: 'Téléphone (10 chiffres)' },
      { name: 'first_name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Prénom' },
      { name: 'last_name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Nom de famille' },
      { name: 'role', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'marchand | producteur | cooperative | institution | identificateur | consommateur' },
      { name: 'region', type: 'VARCHAR(50)', constraints: 'NULLABLE', description: 'Région en Côte d\'Ivoire' },
      { name: 'commune', type: 'VARCHAR(100)', constraints: 'NULLABLE', description: 'Commune/ville' },
      { name: 'activity', type: 'VARCHAR(100)', constraints: 'NULLABLE', description: 'Type d\'activité' },
      { name: 'market', type: 'VARCHAR(100)', constraints: 'NULLABLE', description: 'Nom du marché (marchands)' },
      { name: 'cooperative_name', type: 'VARCHAR(200)', constraints: 'NULLABLE', description: 'Nom de la coopérative' },
      { name: 'institution_name', type: 'VARCHAR(200)', constraints: 'NULLABLE', description: 'Nom de l\'institution' },
      { name: 'score', type: 'INTEGER', constraints: 'DEFAULT 50', description: 'Score de réputation (0-100)' },
      { name: 'validated', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Profil validé par identificateur' },
      { name: 'verified_phone', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Téléphone vérifié par OTP' },
      { name: 'photo_url', type: 'TEXT', constraints: 'NULLABLE', description: 'URL photo de profil' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT NOW()', description: 'Date de création' },
      { name: 'updated_at', type: 'TIMESTAMP', constraints: 'AUTO UPDATE', description: 'Dernière mise à jour' },
      { name: 'last_login_at', type: 'TIMESTAMP', constraints: 'NULLABLE', description: 'Dernière connexion' },
    ],
  },
  {
    name: 'kv_store_488793d3',
    description: 'Stockage clé-valeur (OTP, sessions, paramètres système, cache)',
    icon: Database,
    color: 'purple',
    columns: [
      { name: 'key', type: 'TEXT', constraints: 'PK', description: 'Clé unique (ex: "otp:0707123456")' },
      { name: 'value', type: 'JSONB', constraints: 'NOT NULL', description: 'Valeur JSON flexible' },
    ],
  },
  {
    name: 'auth.users',
    description: 'Table système Supabase Auth (non modifiable directement)',
    icon: Key,
    color: 'green',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PK', description: 'ID utilisateur auth' },
      { name: 'email', type: 'VARCHAR', constraints: 'UNIQUE', description: 'Format: {phone}@julaba.local' },
      { name: 'encrypted_password', type: 'TEXT', constraints: '', description: 'Mot de passe hashé' },
      { name: 'email_confirmed_at', type: 'TIMESTAMP', constraints: '', description: 'Confirmation email (auto)' },
      { name: 'user_metadata', type: 'JSONB', constraints: '', description: 'Métadonnées custom' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: '', description: 'Date de création' },
      { name: 'last_sign_in_at', type: 'TIMESTAMP', constraints: '', description: 'Dernière connexion' },
    ],
  },
];

const kvExamples = [
  {
    prefix: 'otp:',
    description: 'Codes OTP de connexion',
    example: {
      key: 'otp:0707123456',
      value: {
        code: '4582',
        expiresAt: '2026-03-05T10:45:00Z',
        attempts: 0,
        createdAt: '2026-03-05T10:35:00Z',
      },
    },
  },
  {
    prefix: 'system:',
    description: 'Paramètres système',
    example: {
      key: 'system:support_phone',
      value: {
        value: '0700000000',
        updatedBy: 'admin@julaba.ci',
        updatedAt: '2026-03-01T08:00:00Z',
      },
    },
  },
  {
    prefix: 'session:',
    description: 'Sessions temporaires',
    example: {
      key: 'session:onboarding_0707123456',
      value: {
        phone: '0707123456',
        step: 'choose_role',
        data: { firstName: 'Aya', lastName: 'Kouassi' },
        expiresAt: '2026-03-05T12:00:00Z',
      },
    },
  },
  {
    prefix: 'cache:',
    description: 'Données en cache',
    example: {
      key: 'cache:product_list',
      value: {
        products: [],
        cachedAt: '2026-03-05T10:00:00Z',
        expiresAt: '2026-03-05T11:00:00Z',
      },
    },
  },
];

export default function DatabaseViewer() {
  const [expandedTables, setExpandedTables] = useState<string[]>(['users_julaba']);
  const [expandedKvExamples, setExpandedKvExamples] = useState<string[]>([]);

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) =>
      prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]
    );
  };

  const toggleKvExample = (prefix: string) => {
    setExpandedKvExamples((prev) =>
      prev.includes(prefix) ? prev.filter((p) => p !== prefix) : [...prev, prefix]
    );
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, any> = {
      blue: {
        bg: 'bg-blue-100',
        border: 'border-blue-200',
        text: 'text-blue-600',
        icon: 'bg-blue-600',
      },
      purple: {
        bg: 'bg-purple-100',
        border: 'border-purple-200',
        text: 'text-purple-600',
        icon: 'bg-purple-600',
      },
      green: {
        bg: 'bg-green-100',
        border: 'border-green-200',
        text: 'text-green-600',
        icon: 'bg-green-600',
      },
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Structure de la base de données Jùlaba</h1>
              <p className="text-gray-600">PostgreSQL via Supabase - 3 tables principales</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-4">
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-900">users_julaba</p>
              <p className="text-sm text-blue-700">19 colonnes</p>
            </div>
            <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-4">
              <Database className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-900">kv_store_488793d3</p>
              <p className="text-sm text-purple-700">2 colonnes (flexible)</p>
            </div>
            <div className="bg-green-50 rounded-2xl border-2 border-green-200 p-4">
              <Key className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-900">auth.users</p>
              <p className="text-sm text-green-700">Supabase Auth</p>
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="space-y-4">
          {tables.map((table) => {
            const isExpanded = expandedTables.includes(table.name);
            const colors = getColorClasses(table.color);
            const Icon = table.icon || Database;

            return (
              <div
                key={table.name}
                className={`bg-white rounded-3xl border-2 ${colors.border} overflow-hidden transition-all`}
              >
                {/* En-tête de table */}
                <button
                  onClick={() => toggleTable(table.name)}
                  className={`w-full ${colors.bg} p-6 flex items-center justify-between hover:opacity-80 transition-opacity`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${colors.icon} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className={`text-xl font-bold ${colors.text}`}>{table.name}</h3>
                      <p className="text-sm text-gray-600">{table.description}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className={`w-6 h-6 ${colors.text}`} />
                  ) : (
                    <ChevronRight className={`w-6 h-6 ${colors.text}`} />
                  )}
                </button>

                {/* Colonnes */}
                {isExpanded && (
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-bold text-gray-700">Colonne</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-700">Type</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-700">Contraintes</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-700">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((col, idx) => (
                            <tr key={col.name} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="py-3 px-4 font-mono text-sm font-medium text-gray-900">
                                {col.name}
                              </td>
                              <td className="py-3 px-4 font-mono text-sm text-purple-600">{col.type}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {col.constraints && (
                                  <span className="inline-block px-2 py-1 bg-gray-200 rounded-lg text-xs">
                                    {col.constraints}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">{col.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Exemples KV Store */}
        <div className="mt-6 bg-white rounded-3xl border-2 border-purple-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Exemples de données KV Store</h2>
          </div>

          <div className="space-y-4">
            {kvExamples.map((item) => {
              const isExpanded = expandedKvExamples.includes(item.prefix);

              return (
                <div key={item.prefix} className="border-2 border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleKvExample(item.prefix)}
                    className="w-full bg-gray-50 p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-mono font-bold text-purple-600">{item.prefix}*</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-gray-900">
                      <pre className="text-sm text-green-400 overflow-x-auto">
                        {JSON.stringify(item.example, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Relations */}
        <div className="mt-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl border-2 border-blue-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Relations entre tables</h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="bg-green-100 rounded-2xl border-2 border-green-200 p-4 text-center">
                <Key className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-bold text-green-900">auth.users</p>
                <p className="text-xs text-green-700">id (PK)</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-0.5 w-12 bg-gray-400"></div>
                <span className="text-sm font-medium text-gray-600">1:1</span>
                <div className="h-0.5 w-12 bg-gray-400"></div>
              </div>

              <div className="bg-blue-100 rounded-2xl border-2 border-blue-200 p-4 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="font-bold text-blue-900">users_julaba</p>
                <p className="text-xs text-blue-700">auth_user_id (FK)</p>
              </div>
            </div>

            <div className="mt-6 bg-purple-50 rounded-xl border border-purple-200 p-4">
              <p className="text-sm text-purple-900 font-medium">
                <strong>Relation :</strong> users_julaba.auth_user_id → auth.users.id
              </p>
              <p className="text-xs text-purple-700 mt-1">
                Chaque profil Jùlaba est lié à un compte d'authentification Supabase
              </p>
            </div>
          </div>
        </div>

        {/* Lien vers documentation */}
        <div className="mt-6 bg-yellow-50 rounded-3xl border-2 border-yellow-200 p-6 text-center">
          <p className="text-gray-700">
            📄 Documentation complète disponible dans{' '}
            <code className="bg-yellow-100 px-2 py-1 rounded-lg font-mono text-sm">/DATABASE_STRUCTURE.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}