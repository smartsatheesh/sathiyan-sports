import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../server/Mongo";
import Contact from "../../models/Contact";

// POST - Create a new contact submission
export async function POST(req: NextRequest) {
  try {
    console.log("Contact API: Starting connection to database...");
    await connectDB();
    console.log("Contact API: Database connected successfully");

    const body = await req.json();
    console.log("Contact API: Received data:", body);
    const { name, email, mobile, message } = body;

    // Validation
    if (!name || !email || !mobile || !message) {
      console.log("Contact API: Validation failed - missing fields");
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    console.log("Contact API: Creating contact with data:", {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      message: message.trim(),
    });

    // Create new contact
    const contact = new Contact({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      message: message.trim(),
    });

    const savedContact = await contact.save();
    console.log("Contact API: Contact saved successfully:", savedContact._id);

    return NextResponse.json(
      { 
        success: true, 
        message: "Thank you for your message! We'll get back to you soon.",
        contactId: contact._id
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error creating contact:", error);
    
    if (error instanceof Error) {
      // Handle validation errors
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { success: false, message: "Please check your input and try again" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Failed to submit your message. Please try again." },
      { status: 500 }
    );
  }
}

// GET - Fetch all contact submissions (for admin)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");

    const query: any = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(query);

    return NextResponse.json({
      success: true,
      contacts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });

  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}
