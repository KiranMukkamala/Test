
!INC Local Scripts.EAConstants-JavaScript
!INC EAScriptLib.JavaScript-Dialog
!INC EAScriptLib.JavaScript-TaggedValue 

/*
 * This code has been included from the default Project Browser template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.   
 * 
 * Script Name: Add Tagged Value
 * Author: Kiran Mukkamala
 * Purpose: To Add user defined tagged name along with value to elements which are of anytype
 * Date: 23.01.2024
 */
 
//Global Tagged Value for accessing across functions
var TGV_Name = "";
var TGV_Value = "";
var Element_Type = "";
//Map for Element type to Metatype
const ElementTypeValues = [["action", "Action"], ["activity", "Activity"], ["actor", "Actor"], ["allocatepartition", "AllocateActivityPartition"], ["block", "Block"], ["boundary", "Boundary"], ["centralbuffernode", "CentralBufferNode"], ["comment", "Note"], ["constraintblock", "ConstraintBlock"], ["datastore", "DataStore"], ["decision", "DecisionNode"], ["enumeration", "Enumeration"], ["exception", "ExceptionHandler"], ["final", "Pseudostate"], ["flow specfication", "FlowProperty"], ["flowfinal", "Pseudostate"], ["flowproperty", "FlowProperty"], ["initial", "Pseudostate"], ["interface", "Interface"], ["interface specification ", "Object"], ["interfaceblock", "InterfaceBlock"], ["interruptibleregion", "InterruptibleActivityRegion"], ["mergenode", "MergeNode"], ["objectnode", "Object"], ["partition", "ActivityPartition"], ["port", "Port"], ["property", "Part"], ["proxyport", "Port"], ["requirement", "Requirement"], ["signal", "Signal"], ["structuredactivtiy", "Activity"], ["synchronisation", "Pseudostate"], ["usecase", "UseCase"], ["valuetype", "ValueType"], ["all", "All"]];
 
const Element_Type_Map = new Map(ElementTypeValues);
 
 function ExploreElement(Element, spacecount)
 {
	var ele as EA.Element;
	var myconnector as EA.Connector;
	
	if (Element.MetaType == Element_Type_Map.get(Element_Type) || Element_Type == "all")
	{
		TVSetElementTaggedValue(Element, TGV_Name, TGV_Value, true);
	}
	
	//Check for Sub Elements
	for (var i=0; i< Element.Elements.Count;i++)
	{
		ele = Element.Elements.GetAt(i);	
		
		if (ele.Elements.Count > 0)
		{
			ExploreElement(ele, spacecount+1);
		}
		else
		{
			if (ele.MetaType == Element_Type_Map.get(Element_Type) || Element_Type == "all")
			{
				TVSetElementTaggedValue(ele, TGV_Name, TGV_Value, true);
			}
		}
	}
 }

 function Process_Package(parentPackage, level)
 {
	var PkgList as EA.Collection;
	PkgList = parentPackage.Packages;
	var pkg as EA.Package;
	var subpkg as EA.Package;
		
	if (parentPackage.Elements.Count > 0)
	{
		for (var j=0; j< parentPackage.Elements.Count;j++)
		{
			ExploreElement(parentPackage.Elements.GetAt(j), level+1);
		}
	}
	
	if (PkgList.Count > 0)
	{
//		Session.Output("No.of Sub Packages in Package selected is  :: " + PkgList.Count);
		
		for (var i=0; i< PkgList.Count;i++)
		{
			pkg = PkgList.GetAt(i);
			var SubElementList as EA.Collection;
			
			if (pkg.Element.Type == "Package")
			{
				Process_Package(pkg, level+1);
			}
		}
	}
 }
 
 /**
 * Displays a 'Confirm' dialog and returns the OK/Cancel button value that the user had selected.
 *
 * @param[in] promptText (String) The text prompt that will be displayed on the confirm dialog.
 * @param[in] title (String) The text that will appear in the confirm dialog's title.
 *
 * @return A Response value representing the choice the user pressed between OK or Cancel buttons
 */
function DLG_Confirm( promptText /* : String */, title /* : String */ ) /* : Number */
{
      // JScript has no intrinsic MsgBox method, therefore we have to steal from VBs
      var vbe = new COMObject("ScriptControl");
      vbe.Language = "VBScript";
      
      return vbe.Eval( "MsgBox(\"" + promptText + "\",vbOKCancel+vbQuestion,\"" + title + "\")");
}

function get_Input(input, name)
{
	var response;
	var vbe = new COMObject("ScriptControl");
	var element = null;
	vbe.Language = "VBScript";
	
	element = vbe.Eval( input);
	
	if ((element == "") || (element == name))
	{
		response = DLG_Confirm("Entered " + name +" is not correct. Click OK to try again or Cancel to stop!!!", "Wrong Data, Try Again !!!");
		
		if (response == 1)
		{
			return get_Input(input, name);
		}
		else
		{
			return null;
		}
	}
	
	return element;
}


function get_User_Input()
{
	var response;
	var vbe = new COMObject("ScriptControl");
	vbe.Language = "VBScript";
	
	TGV_Name = get_Input("InputBox(\"" + "Enter Tagged Name to be added" + "\",\"" + "Add Tagged Name" + "\",\"" + "TaggedName" + "\")", "TaggedName");
	
	if(TGV_Name == null)
	{
		return 0; // stop proceeding
	}
	
	TGV_Value = get_Input("InputBox(\"" + "Enter Tagged Value to be added" + "\",\"" + "Add Tagged Value" + "\",\"" + "TaggedValue" + "\")", "TaggedValue");
	
	if(TGV_Value == null)
	{
		return 0; // stop proceeding
	}
	
	Element_Type = get_Input("InputBox(\"" + "Enter Element type to be modified from list: Action, Activity, Actor, AllocatePartition, Block, Boundary, CentralBufferNode, Comment, ConstraintBlock, DataStore, Decision, Enumeration, Exception, Final, Flow Specfication, FlowFinal, FlowProperty, Initial, Interface, Interface Specification , InterfaceBlock, InterruptibleRegion, MergeNode, ObjectNode, Partition, Port, Property, ProxyPort, Requirement, Signal, StructuredActivtiy, Synchronisation, UseCase, ValueType, All" + "\",\"" + "Element type" + "\",\"" + "" + "\")", "ElementType");
	
	if(Element_Type == null)
	{
		return 0; // stop proceeding
	}
	
	Element_Type = Element_Type.toLowerCase();
	
	while (!Element_Type_Map.has(Element_Type))
	{
		response = DLG_Confirm("Entered Element type is not present in the list provided. Click OK to try again or Cancel to stop!!!", "Wrong Data, Try Again !!!");
		
		if (response == 1)
		{
			Element_Type = get_Input("InputBox(\"" + "Enter Element type to be modified from list: Action, Activity, Actor, AllocatePartition, Block, Boundary, CentralBufferNode, Comment, ConstraintBlock, DataStore, Decision, Enumeration, Exception, Final, Flow Specfication, FlowFinal, FlowProperty, Initial, Interface, Interface Specification , InterfaceBlock, InterruptibleRegion, MergeNode, ObjectNode, Partition, Port, Property, ProxyPort, Requirement, Signal, StructuredActivtiy, Synchronisation, UseCase, ValueType, All" + "\",\"" + "Element type" + "\",\"" + "" + "\")", "ElementType");
			
		}
		
		if (Element_Type == null || response == 2)
		{
			return 0; // stop proceeding
		}

	}
	
	return 1; // All input OK.
}
 
/*
 * Project Browser Script main function
 */
function OnProjectBrowserScript()
{
	// Get the type of element selected in the Project Browser
	var treeSelectedType = Repository.GetTreeSelectedItemType();

	// Handling Code: Uncomment any types you wish this script to support
	// NOTE: You can toggle comments on multiple lines that are currently
	// selected with [CTRL]+[SHIFT]+[C].
	Session.Output("<============ Script Add Tagged Value Started ============>");
	

	//TGV =	DLGInputBox("Enter Tagged Value to be added","Add Tagged Value","TaggedValue");
	var Input_validity = 1;
	
	Input_validity = get_User_Input();
	if (Input_validity == 0)
	{
		Session.Output("<============ Input Invalid, Script Add Tagged Value Ended ============>");
		return;
	}
	
	Session.Output(" Tagged Name: " + TGV_Name +  " Tagged Value: " + TGV_Value + " Elememt type to be modified: " + Element_Type);
	
	switch ( treeSelectedType )
	{
		case otElement :
		{
			// Code for when an element is selected
			var theElement as EA.Element;
			theElement = Repository.GetTreeSelectedObject();
			Session.Output("Element :: " + theElement.Name + ", Element Type :: " + theElement.Stereotype + ", Sub Element Count :: " + theElement.Elements.Count);
			ExploreElement(theElement, 1);
			break;
		}
		case otPackage :
		{
			// Code for when a package is selected
			var thePackage as EA.Package;
			thePackage = Repository.GetTreeSelectedObject();
			var ElementList as EA.Collection;
			ElementList = thePackage.Elements;
			Session.Output("Package selected is:: " + thePackage.Name + " No.of SubPackages in Package selected is :: " + thePackage.Packages.Count + " No.of Elements in Package selected is :: " + ElementList.Count);
			var ele as EA.Element;
			for (var i=0; i< ElementList.Count;i++)
			{
				ele = ElementList.GetAt(i);
				ExploreElement(ele, ele.Stereotype, ele.Elements, 1);
			}
			
			// For All Packages
			var PkgList as EA.Collection;
			PkgList = thePackage.Packages;
			var pkg as EA.Package;
			var subpkg as EA.Package;
			
			for (var i=0; i< PkgList.Count;i++)
			{
				pkg = PkgList.GetAt(i);
				var SubElementList as EA.Collection;
				
				Process_Package(pkg, 1);
			
			}
			
			break;
		}
		case otDiagram :
		{
			// Code for when a diagram is selected
			var theDiagram as EA.Diagram;
			theDiagram = Repository.GetTreeSelectedObject();
			Session.Output("Diagram selected is  :: " + theDiagram.Name);
			break;
		}
		case otAttribute :
		{
			// Code for when an attribute is selected
			var theAttribute as EA.Attribute;
			theAttribute = Repository.GetTreeSelectedObject();
			Session.Output("Attribute selected is  :: " + theAttribute.Name);	
			break;
		}
		case otMethod :
		{
			// Code for when a method is selected
			var theMethod as EA.Method;
			theMethod = Repository.GetTreeSelectedObject();
			
			break;
		}
		default:
		{
			// Error message
			Session.Prompt( "This script does not support items of this type.", promptOK );
		}
	}
	

	Session.Output("<============ Script Add Tagged Value Ended ============>");
}

OnProjectBrowserScript();
