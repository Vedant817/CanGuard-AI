const { verifyPermission } = require('./blockchainService');

// Log utility for permission service
const logPermissionService = (message, data = {}) => {
  if (process.env.ENABLE_LOGS) {
    console.log(`[PermissionService] ${message}`, JSON.stringify(data));
  }
};

/**
 * Handle incoming permission requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handlePermissionRequest = async (req, res) => {
  try {
    const { permissionData, signature } = req.body;
    logPermissionService('Received permission request', { permissionData });

    const verificationResult = await verifyPermission(permissionData, signature);

    if (!verificationResult.success) {
      logPermissionService('Permission verification failed', { error: verificationResult.error });
      return res.status(400).json({
        success: false,
        message: 'Permission verification failed',
        error: verificationResult.error
      });
    }

    logPermissionService('Permission verified successfully', { requestId: permissionData.requestId });
    res.status(200).json({
      success: true,
      message: 'Permission verified successfully',
      data: verificationResult.data
    });

  } catch (error) {
    logPermissionService('Error handling permission request', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  handlePermissionRequest
};

