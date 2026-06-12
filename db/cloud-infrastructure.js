const { pool } = require('../db/index');

async function getInfrastructureStatus() {
  try {
    const result = await pool.query('SELECT provider, status, region, service FROM cloud_infrastructure');
    return result.rows;
  } catch (err) {
    return [];
  }
}

module.exports = { getInfrastructureStatus };