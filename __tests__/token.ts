import { type AxiosInstance, type AxiosResponse } from 'axios';
import { type GraphQLQuery } from './bankkonto/bankkonto-mutation.resolver.test.js';
import { httpsAgent, tokenPath } from './testserver.js';

type TokenResult = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    access_token: string;
};

const usernameDefault = 'admin';
const passwordDefault = 'p'; // NOSONAR

export const tokenRest = async (
    axiosInstance: AxiosInstance,
    username = usernameDefault,
    password = passwordDefault,
) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded', // eslint-disable-line @typescript-eslint/naming-convention
    };
    const response: AxiosResponse<TokenResult> = await axiosInstance.post(
        tokenPath,
        `username=${username}&password=${password}`,
        { headers, httpsAgent },
    );
    return response.data.access_token;
};

export const tokenGraphQL = async (
    axiosInstance: AxiosInstance,
    username: string = usernameDefault,
    password: string = passwordDefault,
): Promise<string> => {
    const body: GraphQLQuery = {
        query: `
            mutation {
                token(
                    username: "${username}",
                    password: "${password}"
                ) {
                    access_token
                }
            }
        `,
    };

    console.debug(
        'username and password: user=%s, pass=%s',
        username,
        password,
    );
    const response = await axiosInstance.post('graphql', body, { httpsAgent });
    console.debug('response: res=%o', response.data);
    return response.data.data.token.access_token; // eslint-disable-line @typescript-eslint/no-unsafe-return
};
