# Installation MCP Dataleak Server - Procédure complète

## Variables à remplacer

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{SERVER_IP}` | Adresse IP du serveur Ubuntu | `192.168.1.31` |
| `{SERVER_USER}` | Nom d'utilisateur serveur | `user` |
| `{LOCAL_USER}` | Nom d'utilisateur local (Mac/Linux) | `johnsmith` |

---

## Phase 1 : Préparation serveur Ubuntu

### 1.1 Connexion et mise à jour système
```bash
ssh {SERVER_USER}@{SERVER_IP}
sudo apt update
sudo apt upgrade -y
```

### 1.2 Installation des dépendances
```bash
sudo apt install -y curl wget git build-essential nodejs npm
```

### 1.3 Vérification des versions
```bash
node --version
npm --version
```

---

## Phase 2 : Création du projet MCP

### 2.1 Préparation de l'environnement
```bash
cd /home/{SERVER_USER}
rm -rf mcp-server
mkdir mcp-server
cd mcp-server
```

### 2.2 Création du fichier package.json
```bash
cat > package.json << 'EOF'
{
  "name": "mcp-dataleak-simple",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
EOF
```

### 2.3 Installation des dépendances npm
```bash
npm install
```

---

## Phase 3 : Code du serveur MCP

### 3.1 Création du serveur principal
```bash
cat > index.js << 'EOF'
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import * as fs from 'fs';

const DATALEAK_PATH = '/home/{SERVER_USER}/dataleak';

class SimpleDataleakServer {
  constructor() {
    this.server = new Server(
      {
        name: 'simple-dataleak-search',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_dataleak',
            description: 'Recherche dans les fichiers dataleak avec grep',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Terme à rechercher (nom, prénom, IP, email)',
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      console.error(`[DEBUG] Requête: ${name} - "${args.query}"`);

      if (name === 'search_dataleak') {
        return await this.searchDataleak(args);
      } else {
        throw new McpError(ErrorCode.MethodNotFound, `Outil inconnu: ${name}`);
      }
    });
  }

  async searchDataleak(args) {
    const { query } = args;

    if (!query || query.trim().length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'Terme de recherche requis');
    }

    console.error(`[DEBUG] Recherche: "${query}" dans ${DATALEAK_PATH}`);

    if (!fs.existsSync(DATALEAK_PATH)) {
      console.error(`[DEBUG] Dossier manquant: ${DATALEAK_PATH}`);
      throw new McpError(ErrorCode.InternalError, `Dossier dataleak inaccessible`);
    }

    const command = `grep -Ri "${query}" "${DATALEAK_PATH}"`;
    console.error(`[DEBUG] Commande: ${command}`);

    try {
      const result = execSync(command, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });

      console.error(`[DEBUG] Résultat: ${result.length} caractères`);

      const lines = result.trim().split('\n').filter(line => line.length > 0);
      
      if (lines.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Aucune information trouvée pour "${query}" dans les fichiers dataleak.`,
            },
          ],
        };
      }

      let response = `✅ Résultats trouvés pour "${query}":\n\n`;
      
      lines.slice(0, 15).forEach((line) => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const fileName = parts[0].replace('/home/{SERVER_USER}/dataleak/', '');
          const content = parts.slice(1).join(':').trim();
          
          response += `📁 **${fileName}**\n`;
          response += `   ${content}\n\n`;
        }
      });

      if (lines.length > 15) {
        response += `... et ${lines.length - 15} autres résultats trouvés.`;
      }

      console.error(`[DEBUG] Réponse: ${response.length} caractères`);

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };

    } catch (error) {
      console.error(`[DEBUG] Erreur:`, error.message);
      
      if (error.status === 1) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Aucune information trouvée pour "${query}" dans les fichiers dataleak.`,
            },
          ],
        };
      }

      throw new McpError(ErrorCode.InternalError, `Erreur recherche: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Serveur MCP Dataleak Simple démarré');
  }
}

const server = new SimpleDataleakServer();
server.run().catch(console.error);
EOF
```

### 3.2 Remplacement de la variable serveur
```bash
sed -i 's/{SERVER_USER}/{SERVER_USER}/g' index.js
```

---

## Phase 4 : Création des fichiers de test

### 4.1 Création du dossier dataleak
```bash
mkdir -p /home/{SERVER_USER}/dataleak
```

### 4.2 Fichier CSV utilisateurs
```bash
cat > /home/{SERVER_USER}/dataleak/users.csv << 'EOF'
id,nom,prenom,email,ip_address,phone,company
1,Doe,John,john.doe@company.com,192.168.1.100,555-1234,TechCorp
2,Smith,Jane,jane.smith@enterprise.org,10.0.1.50,555-5678,DataSys
3,Wilson,Bob,bob.wilson@startup.net,172.16.2.25,555-9012,InnoLab
4,Brown,Alice,alice.brown@corp.com,192.168.1.101,555-3456,TechCorp
5,Martin,Paul,paul.martin@secure.gov,192.168.1.200,555-7890,GovSec
EOF
```

### 4.3 Fichier logs d'accès
```bash
cat > /home/{SERVER_USER}/dataleak/access.log << 'EOF'
2024-01-15 08:30:15 - john.doe@company.com - LOGIN_SUCCESS - IP:192.168.1.100 - Chrome
2024-01-15 08:31:22 - 192.168.1.100 - FILE_ACCESS - /documents/sensitive.pdf - User:John Doe
2024-01-15 09:15:45 - jane.smith@enterprise.org - PASSWORD_RESET - IP:10.0.1.50
2024-01-15 09:16:12 - Jane Smith - PROFILE_UPDATE - Phone:555-5678 - IP:10.0.1.50
2024-01-15 10:22:33 - bob.wilson@startup.net - ADMIN_ACCESS - IP:172.16.2.25 - Elevated
2024-01-15 11:45:18 - Alice Brown - LOGIN_FAILED - IP:192.168.1.101 - Attempts:3
2024-01-15 14:20:33 - paul.martin@secure.gov - VPN_CONNECT - IP:192.168.1.200 - Location:Remote
EOF
```

### 4.4 Fichier notes
```bash
cat > /home/{SERVER_USER}/dataleak/notes.txt << 'EOF'
NOTES CONFIDENTIELLES:

John Doe - Administrateur système senior
- Email: john.doe@company.com
- IP bureau: 192.168.1.100  
- Téléphone: 555-1234
- Accès root serveur principal

Jane Smith - Responsable RH
- Accès base données employés
- IP: 10.0.1.50

Alice Brown - Développeuse junior  
- Problèmes connexion récurrents depuis 192.168.1.101

Paul Martin - Contact gouvernemental
- Clearance niveau SECRET
- paul.martin@secure.gov
- Connexions VPN depuis 192.168.1.200
EOF
```

### 4.5 Fichier base SQL
```bash
cat > /home/{SERVER_USER}/dataleak/database.sql << 'EOF'
INSERT INTO users_secrets (id, name, email, password_hash, last_ip) VALUES
(1, 'John Doe', 'john.doe@company.com', 'hash123456', '192.168.1.100'),
(2, 'Jane Smith', 'jane.smith@enterprise.org', 'secret789', '10.0.1.50'),
(3, 'Bob Wilson', 'bob.wilson@startup.net', 'pass2024', '172.16.2.25'),
(4, 'Alice Brown', 'alice.brown@corp.com', 'weak123', '192.168.1.101'),
(5, 'Paul Martin', 'paul.martin@secure.gov', 'classified999', '192.168.1.200');

INSERT INTO active_sessions (user_id, session_token, ip_address) VALUES
(1, 'abc123def456ghi789', '192.168.1.100'),
(2, 'xyz789uvw012rst345', '10.0.1.50'),
(5, 'gov999sec888cls777', '192.168.1.200');
EOF
```

---

## Phase 5 : Tests de validation

### 5.1 Test du serveur MCP
```bash
cd /home/{SERVER_USER}/mcp-server
node index.js
```

### 5.2 Test grep manuel
```bash
grep -Ri "John Doe" /home/{SERVER_USER}/dataleak/
grep -Ri "192.168.1.100" /home/{SERVER_USER}/dataleak/
grep -Ri "jane" /home/{SERVER_USER}/dataleak/
```

---

## Phase 6 : Configuration du service systemd

### 6.1 Création du fichier service
```bash
sudo tee /etc/systemd/system/mcp-simple.service > /dev/null << 'EOF'
[Unit]
Description=MCP Simple Dataleak Server
After=network.target

[Service]
Type=simple
User={SERVER_USER}
WorkingDirectory=/home/{SERVER_USER}/mcp-server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
```

### 6.2 Activation du service
```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-simple
sudo systemctl start mcp-simple
sudo systemctl status mcp-simple
```

---

## Phase 7 : Configuration SSH côté client

### 7.1 Génération de la clé SSH
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_dataleak -N ""
```

### 7.2 Copie de la clé vers le serveur
```bash
ssh-copy-id -i ~/.ssh/id_rsa_dataleak.pub {SERVER_USER}@{SERVER_IP}
```

### 7.3 Test de connexion SSH
```bash
ssh -i ~/.ssh/id_rsa_dataleak {SERVER_USER}@{SERVER_IP} 'echo "SSH OK"'
```

### 7.4 Test MCP via SSH
```bash
ssh -i ~/.ssh/id_rsa_dataleak {SERVER_USER}@{SERVER_IP} "cd /home/{SERVER_USER}/mcp-server && timeout 5s node index.js"
```

---

## Phase 8 : Configuration Dive AI

### 8.1 Configuration JSON MCP
```json
{
  "mcpServers": {
    "dataleak-search": {
      "transport": "stdio",
      "enabled": true,
      "command": "ssh",
      "args": [
        "-i",
        "/Users/{LOCAL_USER}/.ssh/id_rsa_dataleak",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        "{SERVER_USER}@{SERVER_IP}",
        "cd /home/{SERVER_USER}/mcp-server && node index.js"
      ],
      "env": {},
      "url": null,
      "headers": null
    }
  }
}
```

### 8.2 Application de la configuration
1. Fermer complètement Dive AI
2. Modifier le fichier de configuration MCP de Dive AI
3. Redémarrer Dive AI
4. Vérifier que "dataleak-search" apparaît avec un point vert

---

## Phase 9 : Tests dans Dive AI

### 9.1 Commandes de test
```
utilise search_dataleak pour John Doe
```

```
utilise search_dataleak pour 192.168.1.100
```

```
utilise search_dataleak pour jane
```

```
utilise search_dataleak pour alice.brown@corp.com
```

---

## Phase 10 : Maintenance

### 10.1 Surveillance des logs
```bash
sudo journalctl -u mcp-simple -f
```

### 10.2 Statut du service
```bash
sudo systemctl status mcp-simple
```

### 10.3 Redémarrage du service
```bash
sudo systemctl restart mcp-simple
```

### 10.4 Ajout de nouveaux fichiers dataleak
```bash
# Copier fichiers vers le serveur
scp fichier.csv {SERVER_USER}@{SERVER_IP}:/home/{SERVER_USER}/dataleak/

# Ou créer directement sur le serveur
nano /home/{SERVER_USER}/dataleak/nouveau_fichier.txt
```

---

## Résolution de problèmes

### Service ne démarre pas
```bash
sudo systemctl status mcp-simple
sudo journalctl -u mcp-simple -n 20
cd /home/{SERVER_USER}/mcp-server
node index.js
```

### Erreur SSH
```bash
ssh -v -i ~/.ssh/id_rsa_dataleak {SERVER_USER}@{SERVER_IP}
```

### Aucun résultat dans Dive AI
```bash
ssh -i ~/.ssh/id_rsa_dataleak {SERVER_USER}@{SERVER_IP} "grep -Ri 'test' /home/{SERVER_USER}/dataleak/"
```

### Dive AI ne voit pas le serveur
1. Vérifier la configuration JSON
2. Redémarrer Dive AI complètement  
3. Vérifier les logs du service
4. Tester la connexion SSH manuellement