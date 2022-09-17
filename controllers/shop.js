const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(
  'sk_test_51JsKhnByX1YeLIhAxV1Kvm7iUofMfF7jyuYLyhk776ZzlD4EcjCREeF65dnNsBpxoRbWWPVYEY7RFjC3sUYoAP1d00EYHoR7DV'
);

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
  let page = +req.query.page || 1;
  let totalItems;

  Product.count()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.findAll({
        offset: (page - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
      });
    })
    .then((product) => {
      res.render('shop/product-list', {
        prods: product,
        pageTitle: 'Products',
        path: '/products',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findByPk(prodId)
    .then((product) => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  let page = +req.query.page || 1;
  let totalItems;

  Product.count()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.findAll({
        offset: (page - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
      });
    })
    .then((product) => {
      res.render('shop/index', {
        prods: product,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .getCart()
    .then((cart) => {
      // console.log(cart);
      return cart
        .getProducts()
        .then((products) => {
          res.render('shop/cart', {
            path: '/cart',
            pageTitle: 'Your Cart',
            products: products,
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  let fetchedCart;
  let newQuantity = 1;
  req.user
    .getCart()
    .then((cart) => {
      fetchedCart = cart;
      return cart.getProducts({ where: { id: prodId } });
    })
    .then((products) => {
      let product;
      if (products.length > 0) {
        product = products[0];
      }

      if (product) {
        const oldQuantity = product.cartItem.quantity;
        newQuantity = oldQuantity + 1;
        return product;
      }
      return Product.findByPk(prodId);
    })
    .then((product) => {
      return fetchedCart.addProduct(product, {
        through: { quantity: newQuantity },
      });
    })
    .then(() => {
      res.redirect('/cart');
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .getCart()
    .then((cart) => {
      return cart.getProducts({ where: { id: prodId } });
    })
    .then((products) => {
      const product = products[0];
      return product.cartItem.destroy();
    })
    .then((result) => {
      res.redirect('/cart');
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let productInCart;
  let total = 0;
  req.user
    .getCart()
    .then((cart) => {
      // console.log(cart);
      return cart
        .getProducts()
        .then((products) => {
          productInCart = products;
          total = 0;
          products.forEach((product) => {
            console.log(product.price);
            // console.log(product.cartItem.quantity);
            total += product.price * product.cartItem.quantity;
          });

          return stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: productInCart.map((p) => {
              return {
                name: p.title,
                description: p.description,
                amount: p.price * 100,
                currency: 'usd',
                quantity: p.cartItem.quantity,
              };
            }),
            success_url:
              req.protocol + '://' + req.get('host') + '/checkout/success', // => http://locahost:3000
            cancel_url:
              req.protocol + '://' + req.get('host') + '/checkout/cancel',
          });
        })
        .then((session) => {
          res.render('shop/checkout', {
            path: '/checkout',
            pageTitle: 'Checkout',
            products: productInCart,
            totalSum: total,
            sessionId: session.id,
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  let fetchedCart;
  req.user
    .getCart()
    .then((cart) => {
      fetchedCart = cart;
      return cart.getProducts();
    })
    .then((products) => {
      return req.user
        .createOrder()
        .then((order) => {
          order.addProducts(
            products.map((product) => {
              product.orderItem = { quantity: product.cartItem.quantity };
              return product;
            })
          );
        })
        .catch((err) => console.log(err));
    })
    .then((result) => {
      return fetchedCart.setProducts(null);
    })
    .then((result) => {
      res.redirect('/orders');
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  req.user
    .getOrders({ include: ['products'] })
    .then((orders) => {
      // console.log(orders);
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findByPk(orderId, { include: ['products'] })
    .then((order) => {
      if (!order) {
        return next(new Error('Order not found!'));
      }
      if (order.userId !== req.user.id) {
        return next(new Error('Unauthorized'));
      }
      const invioceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invioceName);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + invioceName + '"'
      );

      // const { products } = order;

      let totalPrice = 0;

      const pdfDoc = new PDFDocument();

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice', {
        underline: true,
      });
      pdfDoc.text('------------------------------------------');

      order.products.forEach((prod) => {
        totalPrice += prod.orderItem.quantity * prod.price;
        pdfDoc
          .fontSize(14)
          .text(
            `${prod.title} - ${prod.orderItem.quantity}  x  $${prod.price}`
          );
      });
      pdfDoc.text('------------------------------------------');
      pdfDoc.text(`Total Price: $${totalPrice}`);

      pdfDoc.end();
      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader(
      //     'Content-Disposition',
      //     'inline; filename="' + invioceName + '"'
      //   );
      //   res.send(data);
      // });
      // const file = fs.createReadStream(invoicePath);
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader(
      //   'Content-Disposition',
      //   'inline; filename="' + invioceName + '"'
      // );
      // file.pipe(res);
    })
    .catch((err) => next(err));
};
