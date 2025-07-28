const axios = require('axios');
require('dotenv').config();

class PinataMetadataUpdater {
  constructor() {
    this.pinataJWT = process.env.PINATA_JWT;
  }

  /**
   * Update metadata for existing files to make them visible in dashboard
   */
  async updateFileMetadata(ipfsHash, newMetadata) {
    try {
      console.log(`🔄 Updating metadata for file: ${ipfsHash}`);

      const response = await axios.put(`https://api.pinata.cloud/pinning/hashMetadata`, {
        ipfsPinHash: ipfsHash,
        name: newMetadata.name,
        keyvalues: newMetadata.keyvalues
      }, {
        headers: {
          'Authorization': `Bearer ${this.pinataJWT}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        console.log(`✅ Successfully updated metadata for ${ipfsHash}`);
        console.log(`   New name: ${newMetadata.name}`);
        console.log(`   New metadata:`, newMetadata.keyvalues);
        return { success: true };
      } else {
        throw new Error('Failed to update metadata');
      }
    } catch (error) {
      console.error(`❌ Error updating metadata for ${ipfsHash}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all files and update their metadata
   */
  async updateAllFilesMetadata() {
    try {
      console.log('🔍 Fetching all pinned files...\n');

      // Get all pinned files
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
      console.log(`📁 Found ${files.length} files to update:\n`);

      // Update each file with proper metadata
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileNumber = i + 1;
        
        // Create meaningful metadata based on file content
        let metadata = {
          name: `Legacy File ${fileNumber} - ${new Date(file.date_pinned).toLocaleDateString()}`,
          keyvalues: {
            platform: 'CanGuard-AI',
            type: 'legacy-data',
            uploadDate: file.date_pinned,
            fileNumber: fileNumber.toString(),
            size: file.size.toString(),
            updated: new Date().toISOString()
          }
        };

        // Try to determine file type from content
        try {
          const contentResponse = await axios.get(`https://gateway.pinata.cloud/ipfs/${file.ipfs_pin_hash}`, {
            timeout: 5000
          });
          
          const content = contentResponse.data;
          if (content.author && content.title && content.content) {
            // This looks like a Web3 post
            metadata = {
              name: `Web3 Post: ${content.title}`,
              keyvalues: {
                platform: 'CanGuard-AI',
                type: 'web3-post',
                title: content.title,
                author: content.author,
                timestamp: content.timestamp,
                updated: new Date().toISOString()
              }
            };
          }
        } catch (contentError) {
          console.log(`⚠️ Could not read content for ${file.ipfs_pin_hash}, using generic metadata`);
        }

        console.log(`${fileNumber}. Updating file: ${file.ipfs_pin_hash}`);
        console.log(`   Original: ${file.metadata?.name || 'Unnamed'}`);
        console.log(`   New name: ${metadata.name}`);

        const result = await this.updateFileMetadata(file.ipfs_pin_hash, metadata);
        
        if (result.success) {
          console.log(`   ✅ Updated successfully\n`);
        } else {
          console.log(`   ❌ Update failed: ${result.error}\n`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('🎉 Metadata update process completed!');
      console.log('\n💡 Now try refreshing your Pinata dashboard at: https://app.pinata.cloud/pinmanager');
      
    } catch (error) {
      console.error('❌ Error in metadata update process:', error.message);
    }
  }

  /**
   * Verify files are now visible
   */
  async verifyFilesVisible() {
    try {
      console.log('\n🔍 Verifying updated files...\n');

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
      
      console.log('📋 Updated Files List:');
      console.log('=' .repeat(80));
      
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.metadata?.name || 'Still Unnamed'}`);
        console.log(`   CID: ${file.ipfs_pin_hash}`);
        console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`   Date: ${new Date(file.date_pinned).toLocaleString()}`);
        console.log(`   Dashboard URL: https://app.pinata.cloud/pinmanager`);
        console.log(`   Direct Access: https://gateway.pinata.cloud/ipfs/${file.ipfs_pin_hash}`);
        
        if (file.metadata?.keyvalues) {
          console.log(`   Metadata:`, file.metadata.keyvalues);
        }
        console.log('   ' + '-'.repeat(70));
      });

    } catch (error) {
      console.error('❌ Error verifying files:', error.message);
    }
  }
}

// Main execution
async function main() {
  const updater = new PinataMetadataUpdater();

  console.log('🚀 Pinata Metadata Updater');
  console.log('=' .repeat(50) + '\n');
  
  console.log('This script will:');
  console.log('1. Fetch all your pinned files');
  console.log('2. Add proper metadata to make them visible in dashboard');
  console.log('3. Verify the updates worked\n');

  // Update all files metadata
  await updater.updateAllFilesMetadata();
  
  // Verify the changes
  await updater.verifyFilesVisible();

  console.log('\n✅ Process complete!');
  console.log('\n🎯 Next steps:');
  console.log('1. Go to https://app.pinata.cloud/pinmanager');
  console.log('2. Refresh the page (Ctrl+F5)');
  console.log('3. Your files should now be visible with proper names');
  console.log('4. If still not visible, try clearing browser cache');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PinataMetadataUpdater;
