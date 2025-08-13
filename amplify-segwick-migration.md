# WooCommerce Data
Currently stored in Wordpress through the WooCommerce plugin. Data structure and interface is dictated by [WooCommerce API](https://woocommerce.github.io/woocommerce-rest-api-docs/#introduction).

## Products, Customers, Orders
 The primary data objects are Products, Orders and Customers. Customers are WordPress users. Orders are receipts and store which Products Customers have purchased. Products are Audiobooks.

```
                      ┌─────┐           ┌───────┐
               ┌─────►│ORDER├─X   ┌────►│PRODUCT│
┌────────┐     │      └─────┘     │     └───────┘
│CUSTOMER├─────┼─────►│ORDER├─────┼────►│PRODUCT│
└────────┘     │      └─────┘     │     └───────┘
               └─────►│ORDER├─X   └────►│PRODUCT│
                      └─────┘           └───────┘    
```

## Product Vendors
Pro Audio Voices uses the [WooCommerce Vendor extension](https://woocommerce.com/products/product-vendors/) to provide product management tools for authors and publishers. This introduces Vendors, essentially store fronts with names and admin users.


## Audiobook Product
```js
{
    isbn: string,
    title: string,
    author: id,
    tracks: Track[] //ordered list
    ...
}
```

## Audiobook Track
```js
{
    name: string,
    storagePlatform: GCP | AWS
    storageKey: string //bucket and filename in S3 or GCP
    ...
}
```
