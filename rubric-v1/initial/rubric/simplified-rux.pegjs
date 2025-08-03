// Simplified RUX Grammar

{
  function makeNode(type, props) {
    return { type, ...props, location: location() };
  }
}

// ============ Main Structure ============

Module
  = _ annotations:Annotation* _ "module" _ name:Identifier _ "{" _ body:ModuleBody _ "}" _
    { return makeNode('Module', { name, annotations, body }); }

ModuleBody
  = items:( _ item:ModuleItem _ { return item; } )*
    { return items.filter(item => item !== null); }

ModuleItem
  = Annotation
  / TypeDeclaration
  / LocationDeclaration
  / VersionDeclaration
  / Interface
  / State
  / Imports
  / Constraints

// ============ Simple Declarations ============

Annotation
  = "@" _ text:AnnotationText
    { return makeNode('Annotation', { text: text.trim() }); }

AnnotationText
  = chars:(!LineTerminator !"@" char:. { return char; })*
    { return chars.join(''); }

TypeDeclaration
  = "type:" _ value:QuotedString
    { return makeNode('TypeDeclaration', { value }); }

LocationDeclaration
  = "location:" _ value:QuotedString
    { return makeNode('LocationDeclaration', { value }); }

VersionDeclaration
  = "version:" _ value:QuotedString
    { return makeNode('VersionDeclaration', { value }); }

// ============ Interface Block ============

Interface
  = "interface" _ "{" _ members:InterfaceMembers _ "}"
    { return makeNode('Interface', { members }); }

InterfaceMembers
  = members:( _ member:InterfaceMember _ { return member; } )*
    { return members.filter(m => m !== null); }

InterfaceMember
  = Annotation
  / FunctionDeclaration
  / PropertyDeclaration
  / InterfaceTypeDeclaration

FunctionDeclaration
  = visibility:Visibility? _ "function" _ name:Identifier _ "()" _ "->" _ returnType:Type
    {
      return makeNode('FunctionDeclaration', {
        visibility: visibility || 'public',
        name,
        returnType
      });
    }

PropertyDeclaration
  = visibility:Visibility? _ readonly:"readonly"? _ name:Identifier _ ":" _ type:Type
    {
      return makeNode('PropertyDeclaration', {
        visibility: visibility || 'public',
        readonly: !!readonly,
        name,
        type
      });
    }

InterfaceTypeDeclaration
  = visibility:Visibility? _ "type" _ name:Identifier
    {
      return makeNode('InterfaceTypeDeclaration', {
        visibility: visibility || 'public',
        name
      });
    }

// ============ State Block ============

State
  = "state" _ "{" _ members:StateMembers _ "}"
    { return makeNode('State', { members }); }

StateMembers
  = members:( _ member:StateMember _ { return member; } )*
    { return members.filter(m => m !== null); }

StateMember
  = Annotation
  / StateProperty

StateProperty
  = visibility:("private" / "protected")? _ isStatic:"static"? _ readonly:"readonly"? _ name:Identifier _ ":" _ type:Type _ initializer:("=" _ value:SimpleValue { return value; })?
    {
      return makeNode('StateProperty', {
        visibility: visibility || 'private',
        isStatic: !!isStatic,
        readonly: !!readonly,
        name,
        type,
        initializer
      });
    }

// ============ Imports Block ============

Imports
  = "imports" _ "{" _ rules:ImportRules _ "}"
    { return makeNode('Imports', { rules }); }

ImportRules
  = rules:( _ rule:ImportRule _ { return rule; } )*
    { return rules.filter(r => r !== null); }

ImportRule
  = Annotation
  / AllowRule
  / DenyRule

AllowRule
  = "allow" _ path:QuotedString alias:( _ "as" _ a:ImportAlias { return a; })? 
    exception:(
      _ "\\" _ LineTerminator _ "except:" _ exceptions:ExceptionList { return exceptions; }
    )?
    {
      return makeNode('AllowRule', {
        path,
        alias: alias || null,
        exceptions: exception
      });
    }

ImportAlias
  = "external" { return { type: 'external' }; }
  / "{" _ names:IdentifierList _ "}" { return { type: 'named', names }; }
  / name:Identifier { return { type: 'default', name }; }

DenyRule
  = "deny" _ "imports" _ "[" _ patterns:StringList _ "]" 
    exception:(
      _ "\\" _ LineTerminator _ "except:" _ exceptions:StringList { return exceptions; }
    )?
    { return makeNode('DenyRule', { patterns, exceptions: exception }); }

// ============ Constraints Block ============

Constraints
  = "constraints" _ "{" _ rules:ConstraintRules _ "}"
    { return makeNode('Constraints', { rules }); }

ConstraintRules
  = rules:( _ rule:ConstraintRule _ { return rule; } )*
    { return rules.filter(r => r !== null); }

ConstraintRule
  = Annotation
  / RequireRule
  / DenyConstraintRule
  / WarnRule

DenyConstraintRule
  = "deny" _ pattern:ConstraintPattern comparison:( _ c:Comparison { return c; })? comment:( _ c:InlineComment { return c; })? 
    exception:( _ "\\" LineTerminator _ "except:" _ exceptions:ExceptionList { return exceptions; })?
    {
      return makeNode('DenyConstraintRule', {
        pattern,
        comparison,
        comment,
        exceptions: exception
      });
    }

RequireRule
  = "require" _ pattern:ConstraintPattern comparison:( _ c:Comparison { return c; })? comment:( _ c:InlineComment { return c; })? 
    exception:( _ "\\" LineTerminator _ "except:" _ exceptions:ExceptionList { return exceptions; })?
    {
      return makeNode('RequireRule', {
        pattern,
        comparison,
        comment,
        exceptions: exception
      });
    }

WarnRule
  = "warn" _ pattern:ConstraintPattern comparison:( _ c:Comparison { return c; })? comment:( _ c:InlineComment { return c; })? 
    exception:( _ "\\" LineTerminator _ "except:" _ exceptions:ExceptionList { return exceptions; })?
    {
      return makeNode('WarnRule', {
        pattern,
        comparison,
        comment,
        exceptions: exception
      });
    }

// ============ Exception List ============

ExceptionList
  = first:ConstraintPattern rest:( _ "," _ pattern:ConstraintPattern { return pattern; } )*
    { return [first, ...rest]; }

// ============ Patterns and Comments ============

ConstraintPattern
  = parts:PatternPath
    { return parts; }

PatternPath
  = first:Identifier rest:("." part:PatternPart { return "." + part; })*
    { return first + rest.join(''); }

PatternPart
  = Identifier
  / "*"

InlineComment
  = "@" _ text:CommentText
    { return text.trim(); }

CommentText
  = chars:(!LineTerminator !"--" char:. { return char; })*
    { return chars.join(''); }

Comparison
  = _ op:ComparisonOp _ value:ComparisonValue
    { return { op, value }; }

ComparisonOp
  = ">=" / "<=" / ">" / "<" / "="

ComparisonValue
  = QuotedString
  / Number
  / Identifier

// ============ Basic Types ============

Type
  = name:QualifiedName optional:"?"?
    { return optional ? name + "?" : name; }

SimpleValue
  = QuotedString
  / Number  
  / Boolean
  / "null" { return null; }
  / ObjectLiteral
  / ArrayLiteral

ObjectLiteral
  = "{" _ properties:PropertyList? _ "}"
    { return { type: 'object', properties: properties || [] }; }

PropertyList
  = first:Property rest:( _ "," _ p:Property { return p; } )*
    { return [first, ...rest]; }

Property
  = key:Identifier _ ":" _ value:SimpleValue
    { return { key, value }; }

ArrayLiteral
  = "[" _ values:ValueList? _ "]"
    { return { type: 'array', values: values || [] }; }

ValueList
  = first:SimpleValue rest:( _ "," _ v:SimpleValue { return v; } )*
    { return [first, ...rest]; }

// ============ Helpers ============

Visibility
  = "public" / "private" / "protected"

QualifiedName
  = first:Identifier rest:("." name:Identifier { return name; })*
    {
      return rest.length > 0
        ? [first, ...rest].join('.')
        : first;
    }

IdentifierList
  = first:Identifier rest:( _ "," _ id:Identifier { return id; } )*
    { return [first, ...rest]; }

StringList
  = first:QuotedString rest:( _ "," _ s:QuotedString { return s; } )*
    { return [first, ...rest]; }

// ============ Lexical Rules ============

Identifier
  = !ReservedWord name:IdentifierName
    { return name; }

IdentifierName
  = first:[a-zA-Z_$] rest:[a-zA-Z0-9_$]*
    { return first + rest.join(''); }

ReservedWord
  = ("module" / "type" / "location" / "version" / "interface" / "state" / 
     "imports" / "constraints" / "public" / "private" / "protected" / 
     "readonly" / "static" / "function" / "allow" / "deny" / "require" / 
     "warn" / "as" / "external" / "true" / "false" / "null" / "except") !IdentifierContinue

IdentifierContinue
  = [a-zA-Z0-9_$]

Number
  = "-"? digits:[0-9]+
    { return parseInt(digits.join(''), 10); }

Boolean
  = "true" { return true; }
  / "false" { return false; }

QuotedString
  = '"' chars:DoubleStringCharacter* '"'
    { return chars.join(''); }
  / "'" chars:SingleStringCharacter* "'"
    { return chars.join(''); }

DoubleStringCharacter
  = !('"' / "\\") char:. { return char; }
  / "\\" sequence:EscapeSequence { return sequence; }

SingleStringCharacter
  = !("'" / "\\") char:. { return char; }
  / "\\" sequence:EscapeSequence { return sequence; }

EscapeSequence
  = '"' { return '"'; }
  / "'" { return "'"; }
  / "\\" { return "\\"; }
  / "n" { return "\n"; }
  / "r" { return "\r"; }
  / "t" { return "\t"; }

LineTerminator
  = [\n\r]

_ "whitespace"
  = WhiteSpace*

WhiteSpace
  = [ \t\n\r]