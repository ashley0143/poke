const QuickDB = require("quick.db");

/**
 * Initializes subscription-related API routes and account pages.
 *
 * @param {import("express").Express} app - Express application instance
 * @param {object} config - Application configuration
 * @param {Function} renderTemplate - Function to render templates
 */
module.exports = function (app, config, renderTemplate) {
  const db = QuickDB;

  /**
   * Get a user's subscriptions.
   *
   * @route GET /api/get-channel-subs
   * @query {string} ID - User ID
   * @returns {object} JSON response with subscription data or error
   */
  app.get("/api/get-channel-subs", async (req, res) => {
    const userId = String(req.query.ID || "").trim();
    if (!userId) return res.status(400).json({ ok: false, message: "missing ID" });

    const subs = db.get(`user.${userId}.subs`);
    if (!subs) return res.status(404).json({ ok: false, message: "no user found" });

    res.json({ ok: true, data: subs });
  });

  /**
   * Get all subscriptions for a user.
   *
   * @route GET /api/get-all-subs
   * @query {string} ID - User ID
   * @returns {object} JSON response with all subscriptions
   */
  app.get("/api/get-all-subs", async (req, res) => {
    const userId = String(req.query.ID || "").trim();
    if (!userId) return res.status(400).json({ ok: false, message: "missing ID" });

    const subs = db.get(`user.${userId}.subs`) || {};
    res.json({ ok: true, data: subs });
  });

  /**
   * Add a subscription for a user.
   *
   * @route GET /api/set-channel-subs
   * @query {string} ID - User ID
   * @query {string} channelID - Channel ID
   * @query {string} channelName - Channel name
   * @query {string} avatar - Avatar URL
   * @returns {object|Redirect} Redirects to /account-create or error JSON
   */
  app.get("/api/set-channel-subs", async (req, res) => {
    const userId = String(req.query.ID || "").trim();
    const channelId = String(req.query.channelID || "").trim();
    const channelName = String(req.query.channelName || "").trim();
    const avatar = String(req.query.avatar || "").trim();

    if (!userId || !channelId || !channelName || !avatar)
      return res.status(400).json({ ok: false, message: "missing fields" });

    if (userId.length > 7) return res.status(400).json({ ok: false, message: "IDs can be 7 characters max :3" });
    if (["__proto__", "prototype", "constructor"].includes(channelId))
      return res.status(400).json({ ok: false, message: "invalid channel id" });

    const path = `user.${userId}.subs.${channelId}`;
    if (db.get(path)) return res.json({ ok: false, message: "already subscribed" });

    if (!db.get(`user.${userId}.subs`)) db.set(`user.${userId}.subs`, {});
    db.set(path, { channelName, avatar });

    res.redirect("/account-create");
  });

  /**
   * Remove a subscription (or all subscriptions) for a user.
   *
   * @route GET /api/remove-channel-sub
   * @query {string} ID - User ID
   * @query {string} channelID - Channel ID or "ALL"
   * @returns {object} JSON response with status and remaining subs count
   */
  app.get("/api/remove-channel-sub", async (req, res) => {
    const userId = String(req.query.ID || "").trim();
    const channelId = String(req.query.channelID || "").trim();

    if (!userId || !channelId) return res.status(400).json({ ok: false, message: "missing fields" });
    if (!db.get(`user.${userId}.subs`)) return res.status(404).json({ ok: false, message: "no user or subs" });

    if (channelId === "ALL") {
      db.delete(`user.${userId}.subs`);
      db.set(`user.${userId}.subs`, {});
      return res.json({ ok: true, message: "all subscriptions removed", remaining: 0 });
    }

    if (!db.get(`user.${userId}.subs.${channelId}`))
      return res.status(404).json({ ok: false, message: "subscription not found" });

    db.delete(`user.${userId}.subs.${channelId}`);
    const remaining = Object.keys(db.get(`user.${userId}.subs`) || {}).length;
    res.json({ ok: true, message: "subscription removed", remaining });
  });

  /**
   * Render account creation page.
   *
   * @route GET /account-create
   * @returns {HTML} Renders account-create.ejs
   */
  app.get("/account-create", async (req, res) => {
    renderTemplate(res, req, "account-create.ejs", { db });
  });

  /**
   * Render user's account page.
   *
   * @route GET /my-acc
   * @query {string} ID - User ID
   * @returns {HTML|object} Renders account-me.ejs or JSON error
   */
  app.get("/my-acc", async (req, res) => {
    const userId = String(req.query.ID || "").trim();
    if (!userId) return res.status(400).json({ error: "missing ID" });
    if (userId.length > 7) return res.status(400).json({ error: "IDs can be 7 characters max silly :3" });

    const userSubs = db.get(`user.${userId}.subs`) || {};
    renderTemplate(res, req, "account-me.ejs", { userid: userId, userSubs });
  });
};
