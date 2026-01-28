const SegwikClient = require('./segwik-client');
const { PERSONA } = require('./segwik-client');
const client = new SegwikClient(process.env.SEGWIK_API_TOKEN);

const TEST_CUSTOMER = {
    customer_id: 2965675,
    custbase_id: PERSONA.AUTHOR  // Audiobook consumer
};


async function test() {

    const res = await client.updateCustomerById(2965799);
    console.log(JSON.stringify(res.data, null, 2));
}

test();