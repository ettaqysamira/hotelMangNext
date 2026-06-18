# 🎨 Palette Minimaliste - Cyan & Rouge

## Overview
Une palette de couleurs épurée et minimaliste conçue pour HostelHub - Smart Hostel Management System.
**2 couleurs principales** + nuances pour les accents.

---

## 📋 Palette Principale

### 🌌 Fond (Background)
- **Primaire**: `#0a0f1f` - Violet-bleu profond
- **Secondaire**: `#141b2e` - Surface intermédiaire
- **Tertiaire**: `#1f2844` - Borders et éléments
- **Utilisé dans**: Body, containers, sections principales

### ✨ Couleurs d'Accent

#### 🔷 **Primaire - Cyan Brillant**
```
#00ffff (Cyan principal)
#40ffff (Cyan clair)
#00cccc (Cyan foncé)
```
- **Utilisation**: Boutons primaires, liens, icônes, éléments actifs, highlights
- **Sensation**: Moderne, énergique, invitant

#### 🔴 **Accent - Rouge Vibrant**
```
#e63946 (Rouge principal)
#f77f88 (Rouge clair)
#a4161a (Rouge foncé)
```
- **Utilisation**: Boutons secondaires, erreurs, avertissements, accents spéciaux
- **Sensation**: Puissant, attrayant, d'action

### 📝 Texte
- **Primaire**: `#f8f9ff` - Blanc immaculé (contraste maximal)
- **Secondaire**: `#a8c5ff` - Bleu clair (lisible et doux)
- **Tertiaire**: `#7a8fb8` - Bleu moyen (moins important)
- **Muted**: `#5a6a8a` - Bleu foncé (texte très secondaire)

---

## 🎨 Gradients

### Gradient Cyan (Principal)
```css
linear-gradient(135deg, #00ffff 0%, #40ffff 100%)
```
Utilisation: Boutons primaires, titres premium, backgrounds

### Gradient Rouge (Accent)
```css
linear-gradient(135deg, #e63946 0%, #f77f88 100%)
```
Utilisation: Boutons d'action, alertes, accents importants

---

## ✨ Effets et Ombres

### Box Shadows
- **Glow Cyan**: `0 0 20px rgba(0, 255, 255, 0.3)`
- **Glow Red**: `0 0 20px rgba(230, 57, 70, 0.3)`

### Neon Effects
- **Cyan Neon**: `0 0 10px rgba(0, 255, 255, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.2)`
- **Red Neon**: `0 0 10px rgba(230, 57, 70, 0.5), inset 0 0 10px rgba(230, 57, 70, 0.2)`

---

## 🛠️ Utilisation Recommandée

### Composants
| Composant | Couleur | Code |
|-----------|---------|------|
| Bouton Primaire | Cyan | #00ffff |
| Bouton Secondaire | Rouge | #e63946 |
| Lien | Cyan | #00ffff |
| Icône Active | Cyan | #00ffff |
| Icône Warning | Rouge | #e63946 |
| Icône Error | Rouge | #e63946 |
| Border | Dark | #1f2844 |
| Text Primary | White | #f8f9ff |
| Text Secondary | Light Blue | #a8c5ff |

### Dark Mode (toujours activé)
- **Background**: `#0a0f1f` (très foncé)
- **Surface**: `#141b2e` (foncé)
- **Border**: `#1f2844` (gris-bleu foncé)

---

## 🌟 Avantages de cette Palette

✅ **Ultra-simple** - Seulement 2 couleurs principales  
✅ **Forte identité** - Cyan + Rouge = marque reconnaissable  
✅ **Contraste élevé** - Excellent pour l'accessibilité  
✅ **Moderne** - Design contemporain et minimaliste  
✅ **Cohérent** - Facile à maintenir et à appliquer  
✅ **Épuré** - Pas de surcharge visuelle  

---

## 📝 Fichiers de Référence
- Configuration Tailwind: `tailwind.config.ts`
- Palette TypeScript: `src/lib/colors.ts`
- Page d'accueil: `src/app/page.tsx`
- Layout global: `src/app/layout.tsx`

---

**Créée le**: 2026-06-18  
**Version**: 2.0 (Minimaliste)  
**Projet**: HostelHub - Smart Hostel Management System
