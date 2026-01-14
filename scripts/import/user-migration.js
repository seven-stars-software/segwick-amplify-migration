const BASE_API_URL = 'https://api.segwik.com/api/v2';
const USER_PROFILE_ENDPOINT = `${BASE_API_URL}/customer/add`;
const API_TOKEN = process.env.SEGWIK_API_TOKEN;

if (!API_TOKEN) {
    throw new Error('SEGWIK_API_TOKEN is not defined in environment variables');
}

const add_customer = async (user) => {
    
    const res = await fetch(USER_PROFILE_ENDPOINT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            token: API_TOKEN,
            ...user
        }),
    });
    const data = await res.json();
    console.log(data);
}


add_customer({
    firstname: "JACK",
    lastname: "FROST",
    email: "jcksncllwy+NEWPERSON2@gmail.com",

    /** Persona - controls what dashboard looks like, what pages are visible */
    custbase_id: 1121, //1120=author 1121=publisher 1122=listener 1154=narrator 1158=subpub-author
    
    //personas: [1120, 1121], //Can have multiple personas

    //account_id: 6351, //Staff User that owns customer

    //user_id: 6352,
    "lead_from": "zapier"
}).catch(console.error);

/**
 * Next, create CMS Page with the returned user id for pen name and bio
 */