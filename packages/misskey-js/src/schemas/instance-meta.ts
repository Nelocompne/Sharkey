import type { JSONSchema7, JSONSchema7Definition } from 'schema-type';
export const InstanceMetaSharedSchema = {
    $id: 'https://misskey-hub.net/api/schemas/InstanceMetaShared',

    type: 'object',
    properties: {
        maintainerName: { type: ['string', 'null'] },
        maintainerEmail: { type: ['string', 'null'] },
        version: { type: 'string' },
        name: { type: ['string', 'null'] },
        uri: { type: 'string' },
        description: { type: ['string', 'null'] },
        langs: {
            type: 'array',
            items: { type: 'string' },
        },
        tosUrl: { type: ['string', 'null'] },
        repositoryUrl: { type: 'string' },
        feedbackUrl: { type: ['string', 'null'] },
        disableRegistration: { type: 'boolean' },
        emailRequiredForSignup: { type: 'boolean' },
        enableHcaptcha: { type: 'boolean' },
        hcaptchaSiteKey: { type: ['string', 'null'] },
        enableRecaptcha: { type: 'boolean' },
        recaptchaSiteKey: { type: ['string', 'null'] },
        enableTurnstile: { type: 'boolean' },
        turnstileSiteKey: { type: ['string', 'null'] },
        swPublickey: { type: ['string', 'null'] },
        themeColor: { type: ['string', 'null'] },
        mascotImageUrl: {
            type: ['string', 'null'],
            default: '/assets/ai.png',
        },
        bannerUrl: { type: ['string', 'null'] },
        serverErrorImageUrl: { type: ['string', 'null'] },
        infoImageUrl: { type: ['string', 'null'] },
        notFoundImageUrl: { type: ['string', 'null'] },
        iconUrl: { type: ['string', 'null'] },
        backgroundImageUrl: { type: ['string', 'null'] },
        logoImageUrl: { type: ['string', 'null'] },
        defaultLightTheme: { type: ['string', 'null'] },
        defaultDarkTheme: { type: ['string', 'null'] },
        enableEmail: { type: 'boolean' },
        enableServiceWorker: { type: 'boolean' },
        translatorAvailable: { type: 'boolean' },
        policies: {
            type: 'object',
        },
    },
    required: [
        'maintainerName',
        'maintainerEmail',
        'version',
        'name',
        'uri',
        'description',
        'langs',
        'tosUrl',
        'repositoryUrl',
        'feedbackUrl',
        'disableRegistration',
        'emailRequiredForSignup',
        'enableHcaptcha',
        'hcaptchaSiteKey',
        'enableRecaptcha',
        'recaptchaSiteKey',
        'enableTurnstile',
        'turnstileSiteKey',
        'swPublickey',
        'themeColor',
        'mascotImageUrl',
        'bannerUrl',
        'errorImageUrl',
        'iconUrl',
        'backgroundImageUrl',
        'logoImageUrl',
        'defaultLightTheme',
        'defaultDarkTheme',
        'enableEmail',
        'enableServiceWorker',
        'translatorAvailable',
        'policies',
    ],
} as const satisfies JSONSchema7Definition;

export const InstanceMetaAdminSchema = {
    $id: 'https://misskey-hub.net/api/schemas/InstanceMetaAdmin',

    allOf: [
        { $ref: 'https://misskey-hub.net/api/schemas/InstanceMetaShared' },
        {
            type: 'object',
            properties: {
                cacheRemoteFiles: { type: 'boolean' },
                pinnedUsers: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                hiddenTags: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                blockedHosts: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                sensitiveWords: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                preservedUsernames: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                hcaptchaSecretKey: { type: ['string', 'null'] },
                recaptchaSecretKey: { type: ['string', 'null'] },
                turnstileSecretKey: { type: ['string', 'null'] },
                sensitiveMediaDetection: { type: 'string', enum: ['none', 'all', 'local', 'remote'] },
                sensitiveMediaDetectionSensitivity: { type: 'string', enum: ['medium', 'low', 'high', 'veryLow', 'veryHigh'] },
                setSensitiveFlagAutomatically: { type: 'boolean' },
                enableSensitiveMediaDetectionForVideos: { type: 'boolean' },
                proxyAccountId: {
                    $ref: 'https://misskey-hub.net/api/schemas/Id',
                },
                summaryProxy: { type: ['string', 'null'] },
                email: { type: ['string', 'null'] },
                smtpSecure: { type: 'boolean' },
                smtpHost: { type: ['string', 'null'] },
                smtpPort: { type: ['number', 'null'] },
                smtpUser: { type: ['string', 'null'] },
                smtpPass: { type: ['string', 'null'] },
                swPrivateKey: { type: ['string', 'null'] },
                useObjectStorage: { type: 'boolean' },
                objectStorageBaseUrl: { type: ['string', 'null'] },
                objectStorageBucket: { type: ['string', 'null'] },
                objectStoragePrefix: { type: ['string', 'null'] },
                objectStorageEndpoint: { type: ['string', 'null'] },
                objectStorageRegion: { type: ['string', 'null'] },
                objectStoragePort: { type: ['number', 'null'] },
                objectStorageAccessKey: { type: ['string', 'null'] },
                objectStorageSecretKey: { type: ['string', 'null'] },
                objectStorageUseSSL: { type: 'boolean' },
                objectStorageUseProxy: { type: 'boolean' },
                objectStorageSetPublicRead: { type: 'boolean' },
                objectStorageS3ForcePathStyle: { type: 'boolean' },
                deeplAuthKey: { type: ['string', 'null'] },
                deeplIsPro: { type: 'boolean' },
                enableIpLogging: { type: 'boolean' },
                enableActiveEmailValidation: { type: 'boolean' },
                enableChartsForRemoteUser: { type: 'boolean' },
                enableChartsForFederatedInstances: { type: 'boolean' },
                enableServerMachineStats: { type: 'boolean' },
                enableIdenticonGeneration: { type: 'boolean' },
            } satisfies Record<string, JSONSchema7>,
            required: [
                'cacheRemoteFiles',
                'pinnedUsers',
                'hiddenTags',
                'blockedHosts',
                'sensitiveWords',
                'preservedUsernames',
                'hcaptchaSecretKey',
                'recaptchaSecretKey',
                'turnstileSecretKey',
                'sensitiveMediaDetection',
                'sensitiveMediaDetectionSensitivity',
                'setSensitiveFlagAutomatically',
                'enableSensitiveMediaDetectionForVideos',
                'proxyAccountId',
                'summalyProxy',
                'email',
                'smtpSecure',
                'smtpHost',
                'smtpPort',
                'smtpUser',
                'smtpPass',
                'swPrivateKey',
                'useObjectStorage',
                'objectStorageBaseUrl',
                'objectStorageBucket',
                'objectStoragePrefix',
                'objectStorageEndpoint',
                'objectStorageRegion',
                'objectStoragePort',
                'objectStorageAccessKey',
                'objectStorageSecretKey',
                'objectStorageUseSSL',
                'objectStorageUseProxy',
                'objectStorageSetPublicRead',
                'objectStorageS3ForcePathStyle',
                'deeplAuthKey',
                'deeplIsPro',
                'enableIpLogging',
                'enableActiveEmailValidation',
                'enableChartsForRemoteUser',
                'enableChartsForFederatedInstances',
                'enableServerMachineStats',
                'enableIdenticonGeneration',
            ],
        },
    ]
} as const satisfies JSONSchema7Definition;
