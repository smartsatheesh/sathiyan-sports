import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";

// Database migration endpoint to remove old unique indexes
export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();

    const collection = (User as any).collection;
    
    // Get current indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('Current indexes:', indexes.map((idx: any) => ({ 
      name: idx.name, 
      key: idx.key, 
      unique: idx.unique 
    })));

    // Drop mobile index if it exists and is unique
    const mobileIndex = indexes.find((idx: any) => 
      idx.key && idx.key.mobile === 1 && idx.unique === true
    );

    if (mobileIndex) {
      console.log('Dropping mobile unique index:', mobileIndex.name);
      await collection.dropIndex(mobileIndex.name);
    }

    // Drop email index if it exists and is unique
    const emailIndex = indexes.find((idx: any) => 
      idx.key && idx.key.email === 1 && idx.unique === true
    );

    if (emailIndex) {
      console.log('Dropping email unique index:', emailIndex.name);
      await collection.dropIndex(emailIndex.name);
    }

    // Get indexes after cleanup
    const newIndexes = await collection.listIndexes().toArray();
    console.log('Indexes after cleanup:', newIndexes.map((idx: any) => ({ 
      name: idx.name, 
      key: idx.key, 
      unique: idx.unique 
    })));

    return NextResponse.json({
      success: true,
      message: "Database indexes updated successfully",
      droppedIndexes: [
        ...(mobileIndex ? [mobileIndex.name] : []),
        ...(emailIndex ? [emailIndex.name] : [])
      ],
      remainingIndexes: newIndexes.map((idx: any) => ({ 
        name: idx.name, 
        key: idx.key, 
        unique: idx.unique 
      }))
    });

  } catch (error: any) {
    console.error("Error updating database indexes:", error);
    return NextResponse.json(
      { success: false, message: error.message, error: error.toString() },
      { status: 500 }
    );
  }
}