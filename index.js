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
          const fileName = parts[0].replace(`${DATALEAK_PATH}/`, '');
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