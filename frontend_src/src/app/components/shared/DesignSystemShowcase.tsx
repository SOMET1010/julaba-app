/**
 * 🎨 DESIGN SYSTEM SHOWCASE
 * 
 * Page de démonstration de tous les composants shared.
 * Utile pour valider la cohérence visuelle.
 */

import React, { useState } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Mail,
  Check,
} from 'lucide-react';
import {
  SharedButton,
  SharedCard,
  SharedBadge,
  EmptyState,
  SharedModal,
  SharedInput,
  Toast,
  Skeleton,
  SkeletonKPI,
  SkeletonCard,
  SkeletonList,
} from './index';
import { UserRole, ROLE_COLORS } from '../../styles/design-tokens';

export function DesignSystemShowcase() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('marchand');
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const roles: UserRole[] = ['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'];
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎨 JULABA Design System
          </h1>
          <p className="text-gray-600 mb-8">
            Tous les composants partagés pour garantir une cohérence à 100%
          </p>
          
          {/* Sélecteur de rôle */}
          <div className="flex items-center justify-center gap-3">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  selectedRole === role
                    ? 'text-white scale-105'
                    : 'bg-white text-gray-700 hover:scale-102'
                }`}
                style={{
                  backgroundColor: selectedRole === role ? ROLE_COLORS[role] : undefined,
                }}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Buttons */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SharedButton variant="primary" role={selectedRole}>
              Primary
            </SharedButton>
            <SharedButton variant="secondary" role={selectedRole}>
              Secondary
            </SharedButton>
            <SharedButton variant="ghost" role={selectedRole}>
              Ghost
            </SharedButton>
            <SharedButton variant="danger" role={selectedRole}>
              Danger
            </SharedButton>
            <SharedButton 
              variant="primary" 
              role={selectedRole}
              leftIcon={<ShoppingCart className="w-5 h-5" />}
            >
              Avec icône
            </SharedButton>
            <SharedButton 
              variant="primary" 
              role={selectedRole}
              loading
            >
              Loading
            </SharedButton>
          </div>
        </section>
        
        {/* Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SharedCard variant="default" hoverable>
              <h3 className="text-xl font-bold mb-2">Card Default</h3>
              <p className="text-gray-600">Avec effet hover</p>
            </SharedCard>
            <SharedCard variant="elevated" hoverable>
              <h3 className="text-xl font-bold mb-2">Card Elevated</h3>
              <p className="text-gray-600">Ombre plus prononcée</p>
            </SharedCard>
            <SharedCard variant="flat" hoverable>
              <h3 className="text-xl font-bold mb-2">Card Flat</h3>
              <p className="text-gray-600">Avec bordure</p>
            </SharedCard>
          </div>
        </section>
        
        {/* Badges */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <SharedBadge variant="primary" role={selectedRole}>
              Primary
            </SharedBadge>
            <SharedBadge variant="success">
              Success
            </SharedBadge>
            <SharedBadge variant="warning">
              Warning
            </SharedBadge>
            <SharedBadge variant="danger">
              Danger
            </SharedBadge>
            <SharedBadge variant="neutral">
              Neutral
            </SharedBadge>
            <SharedBadge variant="success" icon={<Check className="w-4 h-4" />}>
              Avec icône
            </SharedBadge>
            <SharedBadge variant="success" dot>
              Avec dot
            </SharedBadge>
          </div>
        </section>
        
        {/* Input */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Input</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <SharedInput
              label="Email"
              type="email"
              placeholder="votre@email.com"
              leftIcon={<Mail className="w-5 h-5" />}
              role={selectedRole}
            />
            <SharedInput
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              role={selectedRole}
            />
            <SharedInput
              label="Avec erreur"
              type="text"
              error="Ce champ est requis"
              role={selectedRole}
            />
            <SharedInput
              label="Avec helper text"
              type="text"
              helperText="Message d'aide"
              role={selectedRole}
            />
          </div>
        </section>
        
        {/* Empty State */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Empty State</h2>
          <SharedCard>
            <EmptyState
              icon={Package}
              title="Aucun produit"
              description="Vous n'avez pas encore ajouté de produit à votre stock."
              actionLabel="Ajouter un produit"
              onAction={() => alert('Action !')}
              role={selectedRole}
            />
          </SharedCard>
        </section>
        
        {/* Skeletons */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Skeletons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonKPI />
            <SkeletonKPI />
            <SkeletonKPI />
          </div>
          <div className="mt-6">
            <SkeletonList count={2} />
          </div>
        </section>
        
        {/* Modal & Toast Triggers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Modal & Toast</h2>
          <div className="flex gap-4">
            <SharedButton 
              variant="primary" 
              role={selectedRole}
              onClick={() => setShowModal(true)}
            >
              Ouvrir Modal
            </SharedButton>
            <SharedButton 
              variant="secondary" 
              role={selectedRole}
              onClick={() => setShowToast(true)}
            >
              Afficher Toast
            </SharedButton>
          </div>
        </section>
        
        {/* Modal */}
        <SharedModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Exemple de Modal"
          description="Ceci est un modal de démonstration"
          size="md"
          footer={
            <>
              <SharedButton 
                variant="secondary" 
                role={selectedRole}
                onClick={() => setShowModal(false)}
              >
                Annuler
              </SharedButton>
              <SharedButton 
                variant="primary" 
                role={selectedRole}
                onClick={() => {
                  alert('Enregistré !');
                  setShowModal(false);
                }}
              >
                Enregistrer
              </SharedButton>
            </>
          }
        >
          <div className="space-y-4">
            <SharedInput
              label="Nom"
              placeholder="Votre nom"
              role={selectedRole}
            />
            <SharedInput
              label="Email"
              type="email"
              placeholder="votre@email.com"
              role={selectedRole}
            />
          </div>
        </SharedModal>
        
        {/* Toast */}
        <Toast
          message="✅ Action réussie avec succès !"
          type="success"
          isVisible={showToast}
          onClose={() => setShowToast(false)}
          role={selectedRole}
        />
      </div>
    </div>
  );
}