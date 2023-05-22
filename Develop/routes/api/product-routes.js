const router = require("express").Router();
const { Product, Category, Tag, ProductTag } = require("../../models");

// The `/api/products` endpoint

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Category }, { model: Tag }],
    });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get one product by its `id` value
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category }, { model: Tag }],
    });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Create new product
router.post("/", async (req, res) => {
  try {
    // Create a new product
    const newProduct = await Product.create(req.body);

    // If there are product tags, create them separately
    if (req.body.tagIds && req.body.tagIds.length) {
      const productTags = req.body.tagIds.map((tagId) => {
        return { product_id: newProduct.id, tag_id: tagId };
      });

      await ProductTag.bulkCreate(productTags);
    }

    // Include the associated Category and Tag data in the response
    const productWithAssociations = await Product.findByPk(newProduct.id, {
      include: [{ model: Category }, { model: Tag, through: ProductTag }],
    });

    res.status(201).json(productWithAssociations);
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
});

// Update product
router.put("/:id", (req, res) => {
  // update product data
  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((product) => {
      // find all associated tags from ProductTag
      return ProductTag.findAll({ where: { product_id: req.params.id } });
    })
    .then((productTags) => {
      // get list of current tag_ids
      const productTagIds = productTags.map(({ tag_id }) => tag_id);
      // create filtered list of new tag_ids
      const newProductTags = req.body.tagIds
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
      // figure out which ones to remove
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
        .map(({ id }) => id);

      // run both actions
      return Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
    })
    .then((updatedProductTags) => res.json("product updated successfully"))
    .catch((err) => {
      // console.log(err);
      res.status(400).json(err);
    });
});

// Delete one product by its `id` value
router.delete("/:id", async (req, res) => {
  try {
    const deletedProduct = await Product.destroy({
      where: { id: req.params.id },
    });

    if (!deletedProduct) {
      res.status(400).json({ message: "No product found with this id" });
      return;
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
