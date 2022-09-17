const Product = require('../models/product');
const fileHelper = require('../util/file');

const { validationResult } = require('express-validator/check');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  // const imageUrl = req.body.imageUrl;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);

  console.log(image);
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: 'Attached file is not an image',
      validationErrors: [],
    });
  }

  const imageUrl = image.path;

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  req.user
    .createProduct({
      title: title,
      price: price,
      imageUrl: imageUrl,
      description: description,
    })
    // Product.create({
    //   title: title,
    //   price: price,
    //   imageUrl: imageUrl,
    //   description: description,
    // })
    .then((result) => {
      // console.log(result);
      console.log('create product');
      res.redirect('/admin/products');
    })
    .catch((err) => {
      // return res.status(500).render('admin/edit-product', {
      //   pageTitle: 'Add Product',
      //   path: '/admin/add-product',
      //   editing: false,
      //   hasError: true,
      //   product: {
      //     title: title,
      //     imageUrl: imageUrl,
      //     price: price,
      //     description: description,
      //   },
      //   errorMessage: 'Database operation failed, please try again.',
      //   validationErrors: [],
      // });

      // res.redirect('/500');

      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  // Product.findByPk(prodId)
  req.user
    .getProducts({ where: { id: prodId } })
    .then((products) => {
      const product = products[0];
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        id: prodId,
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  Product.findByPk(prodId)
    .then((product) => {
      if (product.userId !== req.user.id) {
        return res.redirect('/');
      }
      product.title = updatedTitle;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      product.price = updatedPrice;
      product.description = updatedDesc;
      return product.save().then((result) => {
        console.log('UPDATE PRODUCT');
        res.redirect('/admin/products');
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  // Product.findAll()
  req.user
    .getProducts()
    .then((products) => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findOne({ where: { id: prodId, userId: req.user.id } })
    .then((product) => {
      if (!product) {
        return next(new Error('Product not found.'));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.findOne({ where: { id: prodId, userId: req.user.id } });
    })
    .then((product) => {
      product.destroy();
    })
    .then((result) => {
      console.log('DESTROY PRODUCT');
      // res.redirect('/admin/products');
      res.status(200).json({ message: 'Delete completed' });
    })
    .catch((err) => {
      res.status(500).json({ message: 'Delete failed' });
    });
};
