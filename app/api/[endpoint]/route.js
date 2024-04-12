import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

const BASE_URL = "https://127.0.0.1:2999/liveclientdata";

export async function GET(request,{ params: {endpoint} }) {
  try{
    const output = execSync(`curl --insecure ${BASE_URL}/${endpoint}`, { encoding: 'utf-8' });
    const data = JSON.parse(output);
    return NextResponse.json(data, { status: 200 });
  } catch (err){
    return NextResponse.json({}, { status: 500 });
  }
}