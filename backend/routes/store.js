const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * STORE SCHEMAS
 * Note: Assuming `StoreItems` and `UserInventory` tables.
 * 
 * Create StoreItems table if not exists (mock idea, assuming DB migration manages this):
 * id (int, pk), name (varchar), category (varchar - 'tiles', 'frames', 'emojis'), 
 * price (int), discount_percentage (int), is_limited (bit), is_new (bit), 
 * is_popular (bit), image_url (varchar)
 */

// GET /api/store/items
router.get('/items', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM StoreItems');
        res.json(result.rows || []);
    } catch (err) {
        // If table doesn't exist yet, return an empty array or fake items to not crash Frontend
        console.error("Store Items fetch error (table might not exist yet):", err.message);
        res.json([]);
    }
});

// POST /api/store/buy (Protected logic)
// Assuming a middleware handles the `req.user` or we just decode jwt here
// We'll keep it simple: requires a userId and itemId in body
router.post('/buy', async (req, res) => {
    const { userId, itemId } = req.body;
    if (!userId || !itemId) return res.status(400).json({ error: 'Missing parameters' });

    try {
        const itemResult = await db.query('SELECT price, discount_percentage FROM StoreItems WHERE id = $1', [itemId]);
        if (itemResult.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

        const item = itemResult.rows[0];
        const finalPrice = Math.floor(item.price * (1 - (item.discount_percentage || 0) / 100));

        const userResult = await db.query('SELECT coins FROM Users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        if (!user || user.coins < finalPrice) {
            return res.status(400).json({ error: 'Not enough coins' });
        }

        // Deduct coins
        await db.query('UPDATE Users SET coins = coins - $1 WHERE id = $2', [finalPrice, userId]);

        // Add to inventory
        await db.query('INSERT INTO UserInventory (user_id, store_item_id) VALUES ($1, $2)', [userId, itemId]);

        res.json({ success: true, newBalance: user.coins - finalPrice });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Purchase failed' });
    }
});

module.exports = router;
