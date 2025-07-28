# Pinata IPFS Data Access Commands

## View All Pinned Files
```bash
# Using the custom script
node scripts/viewPinataData.js

# Or using curl to list files
curl -X GET "https://api.pinata.cloud/data/pinList?status=pinned" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Access Specific File by CID
```bash
# Using standard Pinata gateway
curl "https://gateway.pinata.cloud/ipfs/[CID]"

# Using your custom gateway
curl "https://copper-tremendous-canidae-112.mypinata.cloud/ipfs/[CID]"

# Using public IPFS gateway
curl "https://ipfs.io/ipfs/[CID]"
```

## Search for CanGuard Files
```bash
# List files with CanGuard metadata
curl -X GET "https://api.pinata.cloud/data/pinList?status=pinned&metadata[keyvalues][platform]=CanGuard-AI" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Download File Locally
```bash
# Download a specific behavioral data file
curl "https://gateway.pinata.cloud/ipfs/[CID]" -o behavioral-data.json

# View downloaded file
cat behavioral-data.json | jq '.'
```

## Account Usage Statistics
```bash
curl -X GET "https://api.pinata.cloud/data/userPinnedDataTotal" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables Used
- `PINATA_JWT`: Your JWT token for API access
- `IPFS_GATEWAY`: Standard gateway URL
- `IPFS_GATEWAY_URL`: Your custom gateway domain

## Example CIDs (replace with actual ones)
- Standard gateway: https://gateway.pinata.cloud/ipfs/QmYourActualCIDHere
- Custom gateway: https://copper-tremendous-canidae-112.mypinata.cloud/ipfs/QmYourActualCIDHere
- Public IPFS: https://ipfs.io/ipfs/QmYourActualCIDHere
