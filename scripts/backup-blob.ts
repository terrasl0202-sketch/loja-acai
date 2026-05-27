import { list } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

interface BackupData {
  timestamp: string;
  version: string;
  description: string;
  blobs: Array<{
    pathname: string;
    url: string;
    size: number;
    uploadedAt: string;
    content?: any;
  }>;
}

async function fetchBlobData(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    console.log(`[backup] Erro ao buscar dados:`, error);
    return null;
  }
}

async function main() {
  console.log('[backup] Iniciando backup completo do Blob...');
  
  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0-stable-premium',
    description: 'Full stable premium delivery system - backup completo',
    blobs: [],
  };

  // Listar todos os blobs
  console.log('[backup] Listando todos os blobs...');
  try {
    const { blobs } = await list();
    
    for (const blob of blobs) {
      console.log(`[backup] Processando: ${blob.pathname} (${blob.size} bytes)`);
      
      const content = await fetchBlobData(blob.url);
      
      backup.blobs.push({
        pathname: blob.pathname,
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt.toISOString(),
        content: content,
      });
    }
    
    console.log(`[backup] Total de blobs processados: ${blobs.length}`);
  } catch (error) {
    console.error('[backup] Erro ao listar blobs:', error);
  }

  // Salvar backup
  const backupDir = path.join(process.cwd(), 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFile = path.join(backupDir, `full-blob-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  
  console.log(`[backup] Backup salvo em: ${backupFile}`);
  
  // Mostrar resumo
  console.log('\n=== RESUMO DO BACKUP ===');
  console.log(`Timestamp: ${backup.timestamp}`);
  console.log(`Version: ${backup.version}`);
  console.log(`Total de blobs: ${backup.blobs.length}`);
  backup.blobs.forEach(b => {
    const hasContent = b.content ? 'COM DADOS' : 'SEM DADOS';
    console.log(`  - ${b.pathname}: ${b.size} bytes [${hasContent}]`);
  });
  console.log('\n[backup] CONCLUIDO COM SUCESSO!');
}

main().catch(console.error);
