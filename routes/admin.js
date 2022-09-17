const path = require('path');

const express = require('express');
const { body } = require('express-validator/check');

const adminController = require('../controllers/admin');

const isAuth = require('../middleware/is-auth');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
  '/add-product',
  [
    body('title')
      .isString()
      .isLength({ min: 5 })
      .trim()
      .withMessage('Title must be string and least 5 characters'),
    // body('imageUrl').isURL().withMessage('Url incorrectly'),
    body('price').isFloat().withMessage('Price incorrectly'),
    body('description')
      .isLength({ min: 5, max: 400 })
      .trim()
      .withMessage('Description must be least 5 characters'),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
  '/edit-product',
  [
    body('title')
      .isString()
      .isLength({ min: 5 })
      .trim()
      .withMessage('Title must be string and least 5 characters'),
    body('price').isFloat().withMessage('Price incorrectly'),
    body('description')
      .isLength({ min: 5, max: 400 })
      .trim()
      .withMessage('Description must be least 5 characters'),
  ],
  isAuth,
  adminController.postEditProduct
);

// router.post('/delete-product', isAuth, adminController.postDeleteProduct);
router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
