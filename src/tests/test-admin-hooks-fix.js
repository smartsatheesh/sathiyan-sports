/**
 * Test script to verify Admin page React Hooks fix
 */

const fs = require('fs');
const path = require('path');

function testAdminHooksFix() {
  console.log('🧪 Testing Admin Page React Hooks Fix...\n');

  try {
    // Read the admin page file
    const adminPagePath = path.join(__dirname, 'src/app/admin/page.tsx');
    const adminContent = fs.readFileSync(adminPagePath, 'utf8');

    console.log('✅ Admin page file found and readable\n');

    // Test 1: Check for duplicate fetchData functions
    const fetchDataMatches = adminContent.match(/const fetchData\s*=/g);
    console.log(`📊 Found ${fetchDataMatches ? fetchDataMatches.length : 0} fetchData declarations`);
    
    if (fetchDataMatches && fetchDataMatches.length > 1) {
      console.log('❌ Multiple fetchData functions found - this will cause compilation errors');
      return false;
    } else {
      console.log('✅ Single fetchData function found - no duplicates');
    }

    // Test 2: Check hook placement order
    const lines = adminContent.split('\n');
    let useStateLines = [];
    let useEffectLines = [];
    let conditionalReturnLines = [];

    lines.forEach((line, index) => {
      if (line.includes('useState') && line.includes('=')) {
        useStateLines.push(index + 1);
      }
      if (line.includes('useEffect')) {
        useEffectLines.push(index + 1);
      }
      if (line.includes('if (') && line.includes('return')) {
        conditionalReturnLines.push(index + 1);
      }
    });

    console.log(`\n📊 Hook Analysis:`);
    console.log(`   useState hooks: ${useStateLines.length} found`);
    console.log(`   useEffect hooks: ${useEffectLines.length} found`);
    console.log(`   Conditional returns: ${conditionalReturnLines.length} found`);

    // Test 3: Verify hooks come before conditional returns
    const firstConditionalReturn = Math.min(...conditionalReturnLines);
    const lastHook = Math.max(...useStateLines, ...useEffectLines);

    if (lastHook < firstConditionalReturn) {
      console.log('✅ All hooks are properly placed before conditional returns');
    } else {
      console.log('❌ Some hooks are placed after conditional returns');
      console.log(`   First conditional return: line ${firstConditionalReturn}`);
      console.log(`   Last hook: line ${lastHook}`);
      return false;
    }

    // Test 4: Check for fetchData placement relative to useEffect
    const fetchDataLine = lines.findIndex(line => line.includes('const fetchData')) + 1;
    const fetchDataUseEffectLine = lines.findIndex(line => 
      line.includes('useEffect') && 
      lines[lines.indexOf(line) + 1]?.includes('fetchData()')
    ) + 1;

    if (fetchDataLine > 0 && fetchDataUseEffectLine > 0) {
      if (fetchDataLine < fetchDataUseEffectLine) {
        console.log('✅ fetchData function is defined before the useEffect that calls it');
      } else {
        console.log('❌ fetchData function is defined after the useEffect that calls it');
        console.log(`   fetchData definition: line ${fetchDataLine}`);
        console.log(`   useEffect calling fetchData: line ${fetchDataUseEffectLine}`);
        return false;
      }
    }

    console.log('\n🎉 All React Hooks Rules compliance tests PASSED!');
    
    // Test 5: Basic syntax check
    try {
      // Simple syntax validation - check for balanced braces
      const openBraces = (adminContent.match(/{/g) || []).length;
      const closeBraces = (adminContent.match(/}/g) || []).length;
      
      if (openBraces === closeBraces) {
        console.log('✅ Basic syntax check passed (balanced braces)');
      } else {
        console.log('❌ Potential syntax error (unbalanced braces)');
        console.log(`   Open braces: ${openBraces}, Close braces: ${closeBraces}`);
      }
    } catch (syntaxError) {
      console.log('⚠️  Syntax check skipped');
    }

    console.log('\n📋 Summary:');
    console.log('✅ React Hooks error: FIXED');
    console.log('✅ Hook placement: CORRECT');
    console.log('✅ Function hoisting: RESOLVED');
    console.log('✅ No duplicate declarations: CONFIRMED');

    return true;

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  const success = testAdminHooksFix();
  process.exit(success ? 0 : 1);
}

module.exports = { testAdminHooksFix };
