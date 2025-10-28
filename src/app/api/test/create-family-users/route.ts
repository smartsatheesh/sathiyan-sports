import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User, { generateNextChampId } from "@/app/models/User";
import bcrypt from "bcryptjs";

// Test endpoint to create family users with same mobile/email
export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();

    const familyData = {
      email: "family@test.com",
      mobile: "9876543210",
      password: "password123"
    };

    const hashedPassword = await bcrypt.hash(familyData.password, 12);

    // Create parent
    const parentChampId = await generateNextChampId();
    const parent = await (User.create as any)({
      champId: parentChampId,
      name: "Parent Kumar",
      email: familyData.email,
      mobile: familyData.mobile,
      password: hashedPassword,
      gender: "male",
      preferredSport: "Cricket",
      subscriptionType: "monthly",
      subscriptionAmount: 1199,
      role: "customer",
      provider: "credentials",
    });

    // Create child 1
    const child1ChampId = await generateNextChampId();
    const child1 = await (User.create as any)({
      champId: child1ChampId,
      name: "Ravi Kumar",
      email: familyData.email,
      mobile: familyData.mobile,
      password: hashedPassword,
      gender: "male",
      preferredSport: "Shuttle Badminton",
      selectedCourt: "S1",
      preferredTimeSlot: "06:00 AM - 07:00 AM",
      subscriptionType: "monthly",
      subscriptionAmount: 1199,
      role: "customer",
      provider: "credentials",
    });

    // Create child 2
    const child2ChampId = await generateNextChampId();
    const child2 = await (User.create as any)({
      champId: child2ChampId,
      name: "Priya Kumar",
      email: familyData.email,
      mobile: familyData.mobile,
      password: hashedPassword,
      gender: "female",
      preferredSport: "Football",
      subscriptionType: "monthly",
      subscriptionAmount: 799,
      role: "customer",
      provider: "credentials",
    });

    return NextResponse.json({
      success: true,
      message: "Family users created successfully",
      users: [
        { champId: parent.champId, name: parent.name },
        { champId: child1.champId, name: child1.name },
        { champId: child2.champId, name: child2.name }
      ],
      loginInfo: {
        mobile: familyData.mobile,
        password: familyData.password,
        note: "Use this mobile and password to test multiple user selection"
      }
    });

  } catch (error: any) {
    console.error("Error creating family users:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}