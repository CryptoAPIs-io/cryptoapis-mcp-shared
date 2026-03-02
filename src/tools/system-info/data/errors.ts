export const errorsData = {
    errors: [
        // 400 Bad Request
        { httpStatus: 400, code: "uri_not_found", message: "The specified URI has not been found. Check the URI and try again." },
        { httpStatus: 400, code: "invalid_pagination", message: "The pagination attributes that have been used are invalid. Please check the Documentation to see details on pagination." },
        { httpStatus: 400, code: "limit_greater_than_allowed", message: "You have reached the allowed limit. Please use pagination attributes to get the items in portions." },
        { httpStatus: 400, code: "invalid_blockchain", message: "The provided blockchain is invalid. Must be a supported blockchain." },
        { httpStatus: 400, code: "invalid_network", message: "The provided network is invalid. Must be a supported network." },
        { httpStatus: 400, code: "invalid_xpub", message: "The provided xPub is invalid." },
        { httpStatus: 400, code: "xpub_not_synced", message: "This xPub is not yet synced, please first use Sync HD Wallet to synchronize it." },

        // 401 Unauthorized
        { httpStatus: 401, code: "invalid_api_key", message: "The provided API key is invalid. Please generate a new one from your Dashboard." },
        { httpStatus: 401, code: "missing_api_key", message: "The specific authorization header (API Key) is missing." },

        // 402 Payment Required
        { httpStatus: 402, code: "insufficient_credits", message: "You have insufficient credits. Please upgrade your plan from your Dashboard or contact the team." },

        // 403 Forbidden
        { httpStatus: 403, code: "address_not_synced", message: "The specified address is not synced. Please sync the address first." },
        { httpStatus: 403, code: "banned_ip_address", message: "This IP address has been banned. Contact the team via email to check the reason." },
        { httpStatus: 403, code: "blockchain_events_callbacks_limit_reached", message: "You have reached the maximum number of active Blockchain Events subscriptions. Upgrade your plan for more." },
        { httpStatus: 403, code: "endpoint_not_allowed_for_api_key", message: "This endpoint is not available for your API key." },
        { httpStatus: 403, code: "endpoint_not_allowed_for_plan", message: "This endpoint is not available for your current subscription plan. Please upgrade." },
        { httpStatus: 403, code: "feature_mainnets_not_allowed_for_plan", message: "Mainnets access is not available for your current subscription plan. Please upgrade." },
        { httpStatus: 403, code: "sync_addresses_limit_reached", message: "You have reached the maximum sync addresses count. Please upgrade your plan." },
        { httpStatus: 403, code: "xpub_is_disabled", message: "This xPub has been deactivated." },
        { httpStatus: 403, code: "xpubs_limit_reached", message: "You have reached the maximum xPub count. Please upgrade your plan." },

        // 404 Not Found
        { httpStatus: 404, code: "not_found", message: "The specified resource has not been found." },
        { httpStatus: 404, code: "resource_not_found", message: "The specified resource has not been found." },
        { httpStatus: 404, code: "blockchain_data_block_not_found", message: "The specified block has not been found on the specific blockchain." },
        { httpStatus: 404, code: "blockchain_data_transaction_not_found", message: "The specified transaction has not been found on the specific blockchain." },
        { httpStatus: 404, code: "blockchain_data_token_details_not_found", message: "The specified token details have not been found on the specific blockchain." },

        // 405 Method Not Allowed
        { httpStatus: 405, code: "sync_address_not_active", message: "The specified address is not active. Please activate your address first." },

        // 409 Conflict
        { httpStatus: 409, code: "already_exists", message: "The specified resource already exists." },
        { httpStatus: 409, code: "can_not_delete_syncing_address", message: "The sync address that you are trying to delete is still being synced." },
        { httpStatus: 409, code: "invalid_data", message: "The data provided seems to be invalid." },
        { httpStatus: 409, code: "sync_address_already_active", message: "The sync address that you are trying to activate is already active." },
        { httpStatus: 409, code: "xpub_already_active", message: "This xPub is already activated." },

        // 415 Unsupported Media Type
        { httpStatus: 415, code: "unsupported_media_type", message: "The selected Media Type is unavailable. The Content-Type header should be 'application/json'." },

        // 422 Unprocessable Entity
        { httpStatus: 422, code: "could_not_calculate_rate_for_pair", message: "Rate could not be calculated due to not enough pair trades data." },
        { httpStatus: 422, code: "invalid_request_body_structure", message: "Your request body for POST requests must have a structure of { data: { item: [...properties] } }." },
        { httpStatus: 422, code: "xpub_sync_in_progress", message: "Your wallet (xPub, yPub, zPub) is still syncing. Please wait a few seconds depending on transaction count." },

        // 429 Too Many Requests
        { httpStatus: 429, code: "request_limit_reached", message: "The request limit has been reached. Please contact the team or upgrade your plan." },

        // 500 Internal Server Error
        { httpStatus: 500, code: "unexpected_server_error", message: "An unexpected server error has occurred. Please try again later and report if it persists." },

        // 501 Not Implemented
        { httpStatus: 501, code: "unimplemented", message: "This feature has not been implemented yet." },
    ],
};
