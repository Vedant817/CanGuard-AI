const axios = require('axios');
require('dotenv').config();

class PinataDataViewer {
  constructor() {
    this.pinataJWT = process.env.PINATA_JWT;
    this.ipfsGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
    this.customGateway = `https://${process.env.IPFS_GATEWAY_URL}/ipfs/`;
  }

  /**
   * List all pinned files from your Pinata account
   */
  async listAllPinnedFiles() {
    try {
      console.log('🔍 Fetching all pinned files from Pinata...\n');

      const response = await axios.get('https://api.pinata.cloud/data/pinList', {
        headers: {
          'Authorization': `Bearer ${this.pinataJWT}`
        },
        params: {
          status: 'pinned',
          pageLimit: 100
        }
      });

      const files = response.data.rows;
      console.log(`📁 Found ${files.length} pinned files:\n`);

      files.forEach((file, index) => {
        console.log(`${index + 1}. File: ${file.metadata?.name || 'Unnamed'}`);
        console.log(`   CID: ${file.ipfs_pin_hash}`);
        console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`   Date: ${new Date(file.date_pinned).toLocaleString()}`);
        console.log(`   Gateway URL: ${this.ipfsGateway}${file.ipfs_pin_hash}`);
        console.log(`   Custom Gateway: ${this.customGateway}${file.ipfs_pin_hash}`);
        console.log(`   Metadata:`, file.metadata?.keyvalues || 'None');
        console.log('   ---');
      });

      return files;
    } catch (error) {
      console.error('❌ Error fetching pinned files:', error.message);
      return [];
    }
  }

  /**
   * Retrieve specific file content by CID
   */
  async retrieveFileContent(cid) {
    try {
      console.log(`🔍 Retrieving content for CID: ${cid}\n`);

      const response = await axios.get(`${this.ipfsGateway}${cid}`, {
        timeout: 15000,
        responseType: 'json'
      });

      console.log('📄 File Content:');
      console.log(JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      console.error('❌ Error retrieving file content:', error.message);
      
      // Try custom gateway as fallback
      try {
        console.log('🔄 Trying custom gateway...');
        const fallbackResponse = await axios.get(`${this.customGateway}${cid}`, {
          timeout: 15000,
          responseType: 'json'
        });
        
        console.log('📄 File Content (via custom gateway):');
        console.log(JSON.stringify(fallbackResponse.data, null, 2));
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('❌ Custom gateway also failed:', fallbackError.message);
        return null;
      }
    }
  }

  /**
   * Filter and show only CanGuard behavioral data
   */
  async showBehavioralData() {
    try {
      const files = await this.listAllPinnedFiles();
      
      const behavioralFiles = files.filter(file => {
        const metadata = file.metadata?.keyvalues || {};
        const name = file.metadata?.name || '';
        return metadata.platform === 'CanGuard-AI' || 
               metadata.dataType === 'behavioral-biometric' ||
               name.includes('behavioral-data') ||
               name.includes('behavioral') || 
               name.includes('identity') ||
               name.includes('CanGuard');
      });

      console.log(`\n🧠 Found ${behavioralFiles.length} CanGuard behavioral data files:\n`);

      for (const file of behavioralFiles) {
        console.log(`📊 Behavioral Data File: ${file.metadata?.name}`);
        console.log(`   CID: ${file.ipfs_pin_hash}`);
        console.log(`   Date: ${new Date(file.date_pinned).toLocaleString()}`);
        console.log(`   Direct Links:`);
        console.log(`   - Pinata Gateway: ${this.ipfsGateway}${file.ipfs_pin_hash}`);
        console.log(`   - Custom Gateway: ${this.customGateway}${file.ipfs_pin_hash}`);
        console.log(`   - IPFS Public: https://ipfs.io/ipfs/${file.ipfs_pin_hash}`);
        
        // Try to retrieve and preview content
        console.log('\n   📄 Content Preview:');
        const content = await this.retrieveFileContent(file.ipfs_pin_hash);
        if (content) {
          if (content.typingStats) {
            console.log(`   - WPM: ${content.typingStats.wpm}`);
            console.log(`   - Accuracy: ${content.typingStats.accuracy}%`);
            console.log(`   - Device: ${content.deviceMetrics?.deviceInfo?.brand} ${content.deviceMetrics?.deviceInfo?.model}`);
          }
          if (content.id && content.id.startsWith('did:')) {
            console.log(`   - DID: ${content.id}`);
            console.log(`   - User ID: ${content.metadata?.userId}`);
          }
        }
        console.log('   ' + '='.repeat(80) + '\n');
      }

      return behavioralFiles;
    } catch (error) {
      console.error('❌ Error showing behavioral data:', error.message);
      return [];
    }
  }

  /**
   * Get Pinata account usage statistics
   */
  async getAccountUsage() {
    try {
      console.log('📊 Fetching Pinata account usage...\n');

      const response = await axios.get('https://api.pinata.cloud/data/userPinnedDataTotal', {
        headers: {
          'Authorization': `Bearer ${this.pinataJWT}`
        }
      });

      const usage = response.data;
      console.log('📈 Account Usage Statistics:');
      console.log(`   Total Files: ${usage.pin_count}`);
      console.log(`   Total Size: ${(usage.pin_size_total / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`   Size with Replications: ${(usage.pin_size_with_replications_total / (1024 * 1024)).toFixed(2)} MB`);
      console.log('');

      return usage;
    } catch (error) {
      console.error('❌ Error fetching account usage:', error.message);
      return null;
    }
  }
}

// Main execution
async function main() {
  const viewer = new PinataDataViewer();

  console.log('🚀 CanGuard AI - Pinata Data Viewer\n');
  console.log('=' * 50 + '\n');

  // Get account usage
  await viewer.getAccountUsage();

  // Show all behavioral data
  await viewer.showBehavioralData();

  console.log('\n✅ Data retrieval complete!');
  console.log('\n💡 Tips:');
  console.log('- Copy any CID and paste it into your browser with the gateway URL');
  console.log('- Use the Pinata dashboard at https://app.pinata.cloud for full management');
  console.log('- Data is encrypted for security - decode using your app\'s decryption keys');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PinataDataViewer;
