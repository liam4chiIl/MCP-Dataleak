# MCP Dataleak Server

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/Protocol-MCP-orange.svg)](https://modelcontextprotocol.io/)

> **Serveur MCP pour investigation OSINT et analyse de dataleak en temps réel**

## Inspiration du Projet

Dans le domaine de la cybersécurité et de l'investigation OSINT, l'analyse de données compromises représente un défi constant. Les professionnels de la sécurité doivent régulièrement examiner de vastes collections de fichiers de dataleak pour identifier des corrélations, tracer des activités malveillantes et comprendre l'étendue des compromissions.

Traditionnellement, cette analyse nécessite l'utilisation d'outils en ligne de commande dispersés, de scripts personnalisés et de processus manuels chronophages. L'émergence du protocole Model Context Protocol (MCP) offre une opportunité unique d'intégrer ces capacités directement dans des interfaces conversationnelles intelligentes.

Ce projet transforme l'investigation de dataleak en permettant aux analystes de formuler des requêtes en langage naturel et d'obtenir des résultats structurés immédiatement exploitables.

## Objectif et Cas d'Usage

### Objectif Principal

Créer un pont entre les techniques d'investigation OSINT traditionnelles et les nouvelles interfaces IA conversationnelles, permettant une analyse rapide et efficace de collections de données compromises.

### Cas d'Usage Typiques

**Investigation de compromission**
- Identifier toutes les occurrences d'un email suspect dans une collection de breach
- Tracer les activités d'un utilisateur à travers différents logs
- Corréler des adresses IP avec des identités dans plusieurs sources

**Analyse de surface d'attaque**
- Vérifier si des identifiants d'organisation apparaissent dans des leaks publics
- Identifier des patterns de mots de passe faibles dans des dumps
- Cartographier l'exposition de données sensibles par service

**Recherche proactive de menaces**
- Surveiller l'apparition de nouveaux identifiants compromis
- Identifier des corrélations entre différentes campagnes d'attaque
- Analyser l'évolution temporelle des compromissions

## Architecture Technique

### Vue d'ensemble

```
Client IA (Claude Desktop / Dive AI)
    |
    | Protocole MCP via SSH
    |
Serveur Ubuntu (Serveur MCP)
    |
    | Système de fichiers
    |
Repository Dataleak (/home/user/dataleak/)
```

### Composants

**Serveur MCP**
- Moteur de recherche basé sur grep système
- Interface standardisée MCP pour les clients IA
- Gestion des erreurs et formatage des résultats

**Transport SSH**
- Connexion sécurisée avec authentification par clés
- Isolation réseau du serveur d'investigation
- Chiffrement de bout en bout des communications

**Repository de données**
- Organisation structurée des fichiers de dataleak
- Support multi-format (CSV, TXT, SQL, LOG, JSON, XML)
- Accès en lecture seule pour préserver l'intégrité

## Configuration Infrastructure

### Variables d'environnement

Avant le déploiement, personnaliser ces variables selon votre infrastructure :

| Variable | Description | Exemple | Localisation |
|----------|-------------|---------|--------------|
| `{SERVER_IP}` | Adresse IP du serveur Ubuntu | `192.168.1.31` | Fichiers de configuration |
| `{SERVER_USER}` | Utilisateur système sur le serveur | `user` | Code source et configs |
| `{LOCAL_USER}` | Utilisateur local du poste d'analyse | `analyst` | Configurations clients MCP |
| `{SSH_KEY_NAME}` | Nom de la clé SSH dédiée | `id_rsa_dataleak` | Configurations SSH |

### Points de modification

**Code source (index.js, src/index.ts)**
```javascript
const DATALEAK_PATH = '/home/{SERVER_USER}/dataleak';
```

**Service systemd (config/mcp-dataleak.service)**
```ini
User={SERVER_USER}
WorkingDirectory=/home/{SERVER_USER}/mcp-server
```

**Configurations clients MCP**
```json
"{SERVER_USER}@{SERVER_IP}"
"/Users/{LOCAL_USER}/.ssh/{SSH_KEY_NAME}"
```

## Organisation des Données

### Structure recommandée

```
/home/{SERVER_USER}/dataleak/
├── breaches/              # Dumps de bases de données compromises
├── logs/                  # Fichiers de logs (accès, authentification, système)
├── leaks/                 # Fuites de données publiques
├── investigations/        # Données d'enquêtes en cours
└── archives/             # Données historiques archivées
```

### Formats supportés

| Extension | Type de données | Usage typique |
|-----------|-----------------|---------------|
| `.csv` | Données tabulaires | Exports de bases utilisateurs, listes de credentials |
| `.txt` | Texte libre | Dumps bruts, notes d'investigation, listes |
| `.sql` | Dumps de bases | Extractions complètes de bases de données |
| `.log` | Fichiers de logs | Logs d'accès, d'authentification, système |
| `.json` | Données structurées | Exports d'APIs, configurations |
| `.xml` | Données XML | Configurations, dumps d'applications |

## Utilisation Opérationnelle

### Interface de recherche

Le serveur expose une fonction unique `search_dataleak` accessible via les clients MCP. La syntaxe d'utilisation dans l'interface conversationnelle :

```
utilise search_dataleak pour [terme de recherche]
```

### Stratégies de recherche

**Recherche par identité**
```
utilise search_dataleak pour john.doe@company.com
utilise search_dataleak pour John Doe
utilise search_dataleak pour johndoe
```

**Recherche par infrastructure**
```
utilise search_dataleak pour 192.168.1.100
utilise search_dataleak pour company.com
utilise search_dataleak pour subdomain.target.org
```

**Recherche par identifiants techniques**
```
utilise search_dataleak pour username123
utilise search_dataleak pour API_KEY_12345
utilise search_dataleak pour session_token
```

**Recherche par informations personnelles**
```
utilise search_dataleak pour +33612345678
utilise search_dataleak pour 1990-05-15
utilise search_dataleak pour "123 Main Street"
```

### Interprétation des résultats

Les résultats sont formatés pour faciliter l'analyse :

```
Résultats trouvés pour "john.doe@company.com":

📁 **breach_2023.csv**
   john.doe@company.com,password123,John,Doe,Administrator,2023-01-15

📁 **access_logs.log**
   2023-12-15 14:30:22 - john.doe@company.com - LOGIN_SUCCESS - IP:192.168.1.100

📁 **vpn_connections.log**
   [2023-12-15 14:35:10] User john.doe@company.com connected from 203.0.113.42
```

Chaque résultat indique :
- Le fichier source de l'information
- Le contexte complet de la ligne trouvée
- Les métadonnées associées si disponibles

### Techniques d'investigation avancées

**Analyse en cascade**
1. Rechercher une identité principale
2. Extraire les adresses IP associées
3. Rechercher ces IPs pour identifier d'autres comptes
4. Répéter le processus pour cartographier un réseau

**Corrélation temporelle**
1. Identifier les timestamps dans les résultats
2. Rechercher des activités simultanées
3. Construire une timeline d'événements

**Validation croisée**
1. Vérifier les informations dans plusieurs sources
2. Identifier les incohérences ou variations
3. Confirmer la véracité des données

## Méthodologie d'Investigation

### Approche structurée

**Phase de reconnaissance**
- Identifier les identifiants principaux (email, nom, username)
- Cartographier les domaines et infrastructures associés
- Établir une baseline des informations connues

**Phase d'exploration**
- Recherches larges sur les identifiants principaux
- Extraction des métadonnées et informations connexes
- Identification de nouveaux vecteurs de recherche

**Phase de corrélation**
- Analyse des patterns et récurrences
- Établissement de liens entre différentes sources
- Construction d'un graphe de relations

**Phase de validation**
- Vérification croisée des informations
- Identification des sources fiables
- Documentation des découvertes

### Bonnes pratiques

**Documentation systématique**
- Enregistrer toutes les requêtes effectuées
- Documenter les sources et contextes
- Maintenir une trace d'audit complète

**Validation des sources**
- Vérifier la date et l'origine des dumps
- Évaluer la fiabilité des informations
- Croiser avec des sources externes

**Respect de la confidentialité**
- Limiter l'accès aux données sensibles
- Respecter les réglementations locales
- Protéger les informations des victimes

## Monitoring et Audit

### Surveillance opérationnelle

Le serveur génère des logs détaillés de toutes les activités :

```bash
# Surveillance en temps réel
sudo journalctl -u mcp-dataleak -f

# Analyse des requêtes
sudo journalctl -u mcp-dataleak | grep "DEBUG"

# Statut du service
sudo systemctl status mcp-dataleak
```

### Métriques d'utilisation

- Volume de requêtes par période
- Termes de recherche les plus fréquents
- Performance des recherches (temps de réponse)
- Taux de succès des requêtes

### Audit de sécurité

- Traçabilité complète des accès
- Logs des connexions SSH
- Historique des modifications de fichiers
- Monitoring des performances système

## Considérations de Sécurité

### Architecture sécurisée

**Isolation réseau**
- Serveur dédié aux investigations
- Segmentation réseau appropriée
- Contrôle d'accès par pare-feu

**Authentification robuste**
- Authentification par clés SSH uniquement
- Pas d'authentification par mot de passe
- Rotation régulière des clés

**Contrôle d'accès**
- Permissions strictes sur les fichiers
- Accès en lecture seule aux données
- Logs d'audit complets

### Conformité réglementaire

**Protection des données**
- Respect du RGPD et réglementations locales
- Anonymisation des données sensibles
- Durée de rétention contrôlée

**Usage éthique**
- Utilisation limitée aux investigations légales
- Documentation de la justification d'usage
- Respect des droits des personnes concernées

## Extension et Personnalisation

### Architecture modulaire

Le code est structuré pour faciliter les extensions :

```typescript
interface SearchArgs {
  query: string;
  options?: SearchOptions;
}

interface SearchOptions {
  caseSensitive?: boolean;
  fileTypes?: string[];
  maxResults?: number;
}
```

### Points d'extension

**Nouveaux formats de données**
- Ajout de parsers spécialisés
- Support de bases de données externes
- Intégration avec des APIs de threat intelligence

**Fonctionnalités de recherche avancées**
- Recherche par expressions régulières
- Recherche floue et approximative
- Indexation pour des performances accrues

**Intégrations externes**
- Export vers des outils d'analyse
- Notifications automatiques
- Interfaces de visualisation

## Support et Contribution

### Documentation

- Documentation technique complète dans `/docs`
- Exemples d'utilisation dans `/examples`
- Guides de troubleshooting dans `/guides`

### Contribution

Le projet accueille les contributions de la communauté OSINT et cybersécurité :

1. Issues pour signaler des bugs ou demandes de fonctionnalités
2. Pull requests pour des améliorations
3. Documentation et exemples d'usage
4. Tests et validation sur différents environnements

### Licence et Usage

Distribué sous licence MIT pour encourager l'adoption par la communauté tout en maintenant la transparence du code source.

**Disclaimer** : Cet outil est destiné exclusivement à des fins d'investigation légales et éthiques. L'utilisateur est responsable du respect des lois locales et de l'utilisation appropriée des données personnelles.

## Liens et Ressources

- [Documentation MCP](https://modelcontextprotocol.io/)
- [OSINT Framework](https://osintframework.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Cybersecurity Investigation Resources](https://github.com/topics/cybersecurity-tools)