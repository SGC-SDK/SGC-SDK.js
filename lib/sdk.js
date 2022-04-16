const { EventEmitter } = require("node:events");

const Embed = require("discord.js").MessageEmbed

const SGCHandlerTypes = {
    embed: "embed",
    webhook: "webhook",
    webhook_with_embed: "webhook_with_embed",
    raw: "raw",
    wraped: "wraped"
};

class SGCError extends Error{
    /**
     * Error throwed at SGC-sdk are wraped by this
     * @param { string } message The Error
     */
    constructor( message = "" ){
        super(message);
    };
};

class SGCWarn{
    /**
     * Warns throwed at SGC-sdk are wraped by this
     * @param { string } message The Warning
     */
    constructor( message = "" ){
        console.warn(`SGCWarn: ${message}`);
    };
};

class SGCHandler extends EventEmitter{
    #parseNoError(str){
        try{
            return JSON.parse(str);
        }catch{
            return null;
        };
    };
    #handlev1(message){
        const content = this.#parseNoError(message.content)
        if(!content || !content.type || content.type !== "message" || !content.userId || !content.userName || !content.userDiscriminator || content.isBot || !content.guildId || !content.guildName || !content.channelId || !content.channelId || !content.messageId)return;
        const discriminator = Number(content.userDiscriminator);
        const msg = {
            id: content.messageId,
            author: {
                id: content.userId,
                username: content.userName,
                discriminator,
                tag: `${content.userName}#${content.userDiscriminator}`,
                avatar: content.userAvatar ? `https://cdn.discordapp.com/avatars/${content.userId}/${content.userAvatar}.png` : `https://cdn.discordapp.com/embed/avatars/${discriminator % 5}.png`
            },
            guild: {
                id: content.guildId,
                name: content.guildName,
                avatar: content.guildIcon ? `https://cdn.discordapp.com/icons/${content.guildId}/${content.guildIcon}.png` : null
            },
            attachments: Array.isArray(content.attachmentsUrl) ?  content.attachments : [],
            message
        };
        if(this.type === SGCHandlerTypes.wraped)return this.emit("v1", msg)
        if(this.type === SGCHandlerTypes.embed)return this.emit("v1", { embeds: [ new Embed().setAuthor({ name: msg.author.tag, iconURL: msg.author.avatar }) ] })
    };
    #handlev2(message){
        const content = this.#parseNoError(message.content);
        if(!content || !content.type)return;

    };
    type = "embed";
    /**
     * The main class of sgc handler
     * @param { object } SGCOptions The options of sgc
     * @param { import("discord.js").Snowflake } SGCOptions.v1 ChannelId of SGC v1
     * @param { import("discord.js").Snowflake } SGCOptions.v2 ChannelId of SGC v2
     * @param { import("discord.js").Client } SGCOptions.client The Client to attach SGC-sdk
     * @param { "embed" | "webhook" | "webhook_with_embed" | "raw" | "wraped" } SGCOptions.type How will it be handled?
     */
    constructor({ v1, v2, client, type = "embed" } = {}){
        if(!type || !SGCHandlerTypes[type])throw new SGCError("Handler types is incorrect");
        if(!client)throw new SGCError("Please provide your bot's client");
        const Channelv1 = client.channels.resolve(v1);
        const Channelv2 = client.channels.resolve(v2);
        if(!Channelv1 || !Channelv2){
            new SGCWarn(`Channel v${ Channelv1 ? "2" : Channelv2 ? "1" : "1&2" } not found. The process will be continued, but SGC won't work`);
            return;
        };
        this.v1 = Channelv1;
        this.v2 = Channelv2;
        this.v1Id = v1;
        this.v2Id = v2;
        this.client = client;
        client.on("messageCreate", message => {
            if(message.author?.bot && message.content && message.author?.id !== client.user?.id){
                if(message.channelId === v1){
                    if(this.type === SGCHandlerTypes.raw)return this.emit("v1", message);
                    return this.#handlev1(message);
                }
                else if(message.channelId === v2){
                    if(this.type === SGCHandlerTypes.raw)return this.emit("v2", message);
                    return this.#handlev2(message);
                }
                else{
                    return;
                }
            }else{
                return;
            };
        });
    };
};