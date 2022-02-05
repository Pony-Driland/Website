var storyCfg = {

    // Info
    underDevelopment: false,
    domain: 'ponydriland.com',
    itemsPerPage: 100,
    title: 'Pony Driland',
    discordInvite: 'GegfAgNxRX',
    description: 'The mysterious world.',
    urlPage: null,
    defaultLang: 'en',
    lang: ['en'],
    defaultYoutubeVolume: 100,
    year: 2021,

    contact: 'tiny@ponydriland.com',

    nftDomain: {
        url: 'https://unstoppabledomains.com/d/{domain}',
        value: 'ponydriland.nft',
        domainWallet: 'jasmindreasond.wallet',
        valueURL: 'ponydriland.nft',
        name: 'Unstoppable Domains'
    },

    creator: 'Yasmin Seidel (JasminDreasond)',
    creator_url: 'https://unstoppabledomains.com/d/ponydriland.nft',
    opensea: 'ponydriland',

    github: {
        account: 'Pony-Driland',
        repository: 'Website'
    },

    ageRating: 'teen',
    tags: [
        "fanfic",
        "pony",
        "driland",
        "adventure",
        "action",
        "drama",
        "comedy",
        "fantasy violence",
        "intense violence",
        "strong language",
        "animated blood",
        "horror",
        "pony driland"
    ],

    // Theme
    theme: {
        primary: '#a91126',
        secondary: '#612c36',
        color: '#fff',
        color2: '#e0e0e0',
        color3: 'rgba(255, 255, 255, 0.6)',
        color4: '#5e5e5e'
    },

    // NSFW Config (You can freely add as many NSFW filters as you like.)
    nsfw: {
        vore: {
            name: 'Vore',
            description: 'Vore is additional content only in some specific scenes. Disabling it will not interfere with the main story. But maybe you\'ll skip some extra canonical info.'
        },
        questionable: {
            name: 'Questionable',
            description: 'The scale of this content is small, but it is present in some quick scenes. Disabling this option will make you skip optional scenes.'
        },
        extreme_violence: {
            name: 'Extreme Violence',
            description: 'Some battle scenes might be considered strong for some viewers. By disabling this option you will decrease the level of violence in the story.'
        }
    },

    // Chapters
    chapterName: {
        1: {
            title: 'This is not my world',
            description: 'The protagonist\'s early days in the world of Pony Driland. Something mysterious has happened and we need to discover the basics about this mysterious place.'
        }
    },

    // IPFS
    ipfs: {
        host: 'https://ipfs.io/ipfs/{cid}'
    },

    // Playlist
    playlist: {

        'battle': [
            { id: 'rjRn9lYguV0', type: 'youtube' },
            { id: 'yb0-hwJAX3U', type: 'youtube' },
        ],

        'tense-battle': [
            { id: 'b6WhRKOMUq0', type: 'youtube' },
            { id: 'rAMJkRhK2cs', type: 'youtube' },
        ],

        'horror-battle': [
            { id: 'b6WhRKOMUq0', type: 'youtube' },
            { id: 'ViCGaoeCUqk', type: 'youtube' },
        ],

        'revenge-battle': [
            { id: 'Ies0Ynk5_SI', type: 'youtube' },
        ],

        'epic-battle': [
            { id: '4tM--a1NLa8', type: 'youtube' },
            { id: 'ltmma6Abi3U', type: 'youtube' },
            { id: 'f3Fi4q7Es2Q', type: 'youtube' },
            { id: 'HRfiZbJ5kW0', type: 'youtube' },
            { id: '2waixMvzakE', type: 'youtube' },
            { id: 'ACXW__UAC7w', type: 'youtube' },
        ],

        'drama-battle': [
            { id: '04_v0iVxCHo', type: 'youtube' },
            { id: '9HvVidW5N6w', type: 'youtube' },
            { id: 'GRoIRQEI1W8', type: 'youtube' },
            { id: '2SsRDysiIlk', type: 'youtube' },
        ],

        'happyness': [
            { id: 'AVxQSpnR7g8', type: 'youtube' },
            { id: 'uFKo2LYu2Zg', type: 'youtube' },
            { id: 'nJSQXalUq2o', type: 'youtube' },
        ],

        'tech-problem': [
            { id: 'bGdD0YVh_kI', type: 'youtube' },
        ],

        'fantasy-village': [
            { id: 'K1vUA9NltVw', type: 'youtube' }
        ],

        'calm': [
            { id: 'mxcu9L9j8ww', type: 'youtube' },
            { id: 'dZR7M7gDNSc', type: 'youtube' },
            { id: '7Uyu5BrGMs4', type: 'youtube' },
            { id: 'ewBkq44wynk', type: 'youtube' },
            { id: 'TOEiLlspdhM', type: 'youtube' },
            { id: 'zaxVBfdgR3E', type: 'youtube' },
            { id: '3VoGUhPwagI', type: 'youtube' },
            { id: 'uU4VgCWuAxE', type: 'youtube' },
            { id: 'dx0YwqEue_M', type: 'youtube' },
            { id: 'XYoTrKYkk1w', type: 'youtube' },
        ],

        'memories': [
            { id: 'Cste0PD-Xt4', type: 'youtube' },
            { id: 'A7DE3BXdPsA', type: 'youtube' },
        ],

        'tense-mystery': [
            { id: '1nBatlpsVj0', type: 'youtube' },
            { id: 'bE__iQGLxyc', type: 'youtube' },
            { id: 'JuKONvqIT4M', type: 'youtube' },
        ],

        'horror-moment': [
            { id: 's2bGUY97o6E', type: 'youtube' },
        ],

        'bad-mystery': [
            { id: 'eeoEQZH-iwg', type: 'youtube' },
            { id: '_x8gYuNUdNA', type: 'youtube' },
            { id: 'DJlgRlhaeME', type: 'youtube' },
            { id: 'VQ9230-OoBw', type: 'youtube' },
            { id: '7dKxHERhaLE', type: 'youtube' },
            { id: 'vlQvh7IrRPk', type: 'youtube' },
        ],

        'the-true': [
            { id: 'XheH4qClv1Q', type: 'youtube' },
            { id: '_x8gYuNUdNA', type: 'youtube' },
        ],

        'sad': [
            { id: 'cU96ZIGKars', type: 'youtube' },
            { id: 'lIjHZy3aYDA', type: 'youtube' },
            { id: 'eqV2_PDDVr4', type: 'youtube' },
            { id: '5i0N9F--gPU', type: 'youtube' },
            { id: 'bL5xpXvmGiM', type: 'youtube' },
            { id: '2lj9kr1LmQ4', type: 'youtube' },
            { id: 'JKgPqJZm1-I', type: 'youtube' },
            { id: 'FSkYYV62FEk', type: 'youtube' },
            { id: '4VFrTREyIig', type: 'youtube' },
            { id: 'E5I667E4GXw', type: 'youtube' },
            { id: '24QJV6NnFHY', type: 'youtube' },
            { id: 'YhXWzeFJtqM', type: 'youtube' },
        ],

        'think': [
            { id: 'Y36Rg14JcZE', type: 'youtube' },
            { id: '6oaXQ_JQY64', type: 'youtube' },
            { id: 'ZXNxF7kVW_8', type: 'youtube' },
            { id: 'UDhQ8DarZHQ', type: 'youtube' },
            { id: 'yNACbXekBVQ', type: 'youtube' },
            { id: 'yKwdd2Aja_k', type: 'youtube' },
            { id: 'DVrsjXSpH9o', type: 'youtube' },
            { id: 'BAB7dhJpqes', type: 'youtube' },
            { id: '4c7Juty0RYI', type: 'youtube' },
            { id: 'ncCnW7MKTCU', type: 'youtube' },
            { id: 'TMLnDTkUEgg', type: 'youtube' },
            { id: '6yPivtTKLno', type: 'youtube' },
            { id: 'SzhjAqPF-gM', type: 'youtube' },
            { id: 'k79T3jVvPjw', type: 'youtube' },
            { id: 'oxivFag3Reg', type: 'youtube' },
            { id: 'ni-Q2RCoexg', type: 'youtube' },
        ],

        'bad-think': [
            { id: '0ZD3SfS9x8E', type: 'youtube' },
            { id: 'AfkEAnazGMo', type: 'youtube' },
            { id: 'QD5OGfAJIus', type: 'youtube' },
            { id: 'eeeQcvtjV2k', type: 'youtube' },
            { id: 'CAMmIyAA6CY', type: 'youtube' },
            { id: 'QNwjH5EKTTQ', type: 'youtube' },
            { id: 'Li2v4Afy1H0', type: 'youtube' },
        ],

        'sad-plot-twist': [
            { id: '44A0UTwoCsg', type: 'youtube' },
        ],

        'new-thing': [
            { id: 'PkIc6TMLfv0', type: 'youtube' },
            { id: 'uV2eI9KBOFs', type: 'youtube' },
            { id: 'E0wknC_56vE', type: 'youtube' },
        ]

    },

    // SFX
    sfx: {

    }

};