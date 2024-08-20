import axios from 'axios';
import { buildQueryParams } from '../../utils';
import { IPumpTokenItem } from '../../common/types';
import { PUMPFUN_RAYDIUM_MIGRATION_PROGRAM_ID, HELIUS_API_KEY } from '../../config';
import { formatResponse } from '../formaters';

export async function getPumpList(params: object): Promise<IPumpTokenItem[]> {
    const query = buildQueryParams({ limit: 20, orderby: 'usd_market_cap', direction: 'desc', pump: 'true', ...params });
    try {
        const res = await axios.get(`https://gmgn.ai/defi/quotation/v1/rank/sol/pump?${query}`, { headers: { 'Cache-Control': 'no-store' } });
        const data = res.data;
        return data.code === 0 ? data.data.rank : [];
    } catch (error) {
        console.error('Error fetching Pump list:', error);
        throw error;
    }
}

export async function getGradiatedPumpList(params: object): Promise<IPumpTokenItem[]> {
    const query = buildQueryParams({ type: 'CREATE_POOL', limit: 30, sort: 'desc', ...params });
    const API_URL = `https://api.helius.xyz/v0/addresses/${PUMPFUN_RAYDIUM_MIGRATION_PROGRAM_ID}/transactions?${query}`;
    try {
        const response = await axios.get(API_URL);
        if (!(response.status == 200)) {
            console.error('Failed to fetch transactions:', response.statusText);
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.data;
        const tokens = formatResponse(data as string[]);
        const tokenDetailsPromises = tokens.map(fetchTokenDetails);
        const tokensAndDetails = await Promise.allSettled(tokenDetailsPromises);
        const fulfilledTokens = tokensAndDetails
            .filter(tokenDetail => tokenDetail.status === 'fulfilled')
            .map(tokenDetail => (tokenDetail as PromiseFulfilledResult<IPumpTokenItem>).value);
        return fulfilledTokens;
    } catch (error) {
        console.error('Error fetching gradated Pump list:', error);
        throw error;
    }
}

export async function fetchTokenDetails(addr: string): Promise<IPumpTokenItem> {
    try {
        const tokenDetailsResult = await axios.get(`https://gmgn.ai/defi/quotation/v1/tokens/sol/${addr}`)
        const tokenDetails = tokenDetailsResult.data
        return tokenDetails.code === 0 ? tokenDetails.data.token : {} as IPumpTokenItem;;
    } catch (error) {
        console.error('Error fetching Token details:', error);
        throw error;
    }
}



export const fetchTokenHolders = async (addr: string) => {
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    let allAccounts: { address: string; amount: number }[] = [];
    let cursor;

    while (true) {
        let params = {
            limit: 1000,
            mint: addr
        };

        if (cursor) {
            (params as any).cursor = cursor;
        }

        const response = await axios.post(url, JSON.stringify({
            jsonrpc: "2.0",
            id: "helius-test",
            method: "getTokenAccounts",
            params: params,
        }))

        const data = response.data;

        if (!data.result || data.result.token_accounts.length === 0) {
            break;
        }

        data.result.token_accounts.forEach((account: any) => {
            allAccounts.push({
                address: account.owner,
                amount: account.amount
            });
        });

        cursor = data.result.cursor;
    }

    const totalSupply = allAccounts.reduce((acc, account) => acc + account.amount, 0);
    const totalHolders = allAccounts.length;

    allAccounts.sort((a, b) => b.amount - a.amount);

    const top10 = allAccounts.slice(0, 10);
    const top50 = allAccounts.slice(10, 50);
    const others = allAccounts.slice(50);

    const calculatePercentage = (amount: number) => ((amount / totalSupply) * 100).toFixed(2);

    const top10_with_percentage = top10.map(account => ({
        ...account,
        percentage: calculatePercentage(account.amount)
    }));

    const top50_with_percentage = top50.map(account => ({
        ...account,
        percentage: calculatePercentage(account.amount)
    }));

    const others_with_percentage = others.map(account => ({
        ...account,
        percentage: calculatePercentage(account.amount)
    }));

    const top10_supply_percentage = top10.reduce((acc, account) => acc + account.amount, 0) / totalSupply * 100;
    const top50_supply_percentage = top50.reduce((acc, account) => acc + account.amount, 0) / totalSupply * 100;
    const others_supply_percentage = others.reduce((acc, account) => acc + account.amount, 0) / totalSupply * 100;

    const top10_holders_percentage = (top10.length / totalHolders * 100).toFixed(2);
    const top50_holders_percentage = (top50.length / totalHolders * 100).toFixed(2);
    const others_holders_percentage = (others.length / totalHolders * 100).toFixed(2);

    return {
        top10_with_percentage: {
            description: 'Top 10 holders with their respective token amount and percentage of total supply.',
            data: top10_with_percentage
        },
        top50_with_percentage: {
            description: 'Top 50 holders (excluding the top 10) with their respective token amount and percentage of total supply.',
            data: top50_with_percentage
        },
        others_with_percentage: {
            description: 'Other holders (excluding the top 50) with their respective token amount and percentage of total supply.',
            data: others_with_percentage
        },
        top10_supply_percentage: {
            description: 'Percentage of the total token supply held by the top 10 holders.',
            data: top10_supply_percentage
        },
        top50_supply_percentage: {
            description: 'Percentage of the total token supply held by the top 50 holders (excluding the top 10).',
            data: top50_supply_percentage
        },
        others_supply_percentage: {
            description: 'Percentage of the total token supply held by other holders (excluding the top 50).',
            data: others_supply_percentage
        },
        top10_holders_percentage: {
            description: 'Percentage of total holders represented by the top 10 holders.',
            data: top10_holders_percentage
        },
        top50_holders_percentage: {
            description: 'Percentage of total holders represented by the top 50 holders (excluding the top 10).',
            data: top50_holders_percentage
        },
        others_holders_percentage: {
            description: 'Percentage of total holders represented by other holders (excluding the top 50).',
            data: others_holders_percentage
        }
    };
};